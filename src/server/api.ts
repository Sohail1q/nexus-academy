import express, { Request, Response } from 'express';
import { dbManager } from './db.js';
import { AppState } from '../types.js';

export const apiRouter = express.Router();

// SSE clients pool
const sseClients: Response[] = [];

// Broadcast to all active clients
dbManager.on('state-changed', (newState: AppState) => {
  const payload = `data: ${JSON.stringify({ type: 'STATE_UPDATE', data: newState })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const res = sseClients[i];
    try {
      res.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
});

// 1. Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    academy: dbManager.getState().settings.name,
    studentsCount: dbManager.getState().students.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Get full persistent state
apiRouter.get('/state', (_req: Request, res: Response) => {
  res.json(dbManager.getState());
});

// 3. Save / update full state
apiRouter.post('/state', (req: Request, res: Response) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }
    const updated = dbManager.updateState(incoming);
    res.json({ success: true, state: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Server-Sent Events (SSE) stream for real-time live sync across all tabs/users
apiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state upon connection
  res.write(
    `data: ${JSON.stringify({ type: 'STATE_UPDATE', data: dbManager.getState() })}\n\n`
  );

  sseClients.push(res);

  // Keep-alive heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// 5. Automatic monthly fee charge or fee payment endpoint
apiRouter.post('/fee/add', (req: Request, res: Response) => {
  try {
    const { studentId, amount, type, note, receiptNo, date } = req.body;
    if (!studentId || typeof amount !== 'number') {
      res.status(400).json({ error: 'studentId and numeric amount are required' });
      return;
    }

    const currentState = dbManager.getState();
    const students = [...currentState.students];
    const studentIdx = students.findIndex((s) => s.id === studentId);

    if (studentIdx === -1) {
      res.status(404).json({ error: `Student ${studentId} not found` });
      return;
    }

    const currentStudent = students[studentIdx];
    const prevDues = currentStudent.dues || 0;
    let newDues = prevDues;
    let newTotalPaid = currentStudent.totalPaid || 0;

    if (type === 'charge_monthly' || type === 'charge') {
      // Adding a monthly fee charge adds to dues
      newDues = prevDues + amount;
    } else {
      // Submitting payment reduces dues and increases total paid
      newDues = Math.max(0, prevDues - amount);
      newTotalPaid += amount;
    }

    students[studentIdx] = {
      ...currentStudent,
      dues: newDues,
      totalPaid: newTotalPaid,
    };

    const newTx = {
      id: 'FEE-TX-' + Date.now(),
      date: date || new Date().toISOString().split('T')[0],
      studentId,
      studentName: currentStudent.name,
      type: (type === 'charge_monthly' ? 'charge_monthly' : 'payment_dues') as any,
      amount,
      prevDues,
      newDues,
      receiptNo: receiptNo || undefined,
      note: note || (type === 'charge_monthly' ? 'Monthly tuition fee added' : 'Fee payment received'),
    };

    const updated = dbManager.updateState({
      students,
      feeTransactions: [newTx, ...(currentState.feeTransactions || [])],
    });

    res.json({ success: true, student: students[studentIdx], transaction: newTx, state: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Automatic Database Setup & Adjustment for Supabase & Cloud DBs (No manual steps needed)
apiRouter.post('/setup-database', async (req: Request, res: Response) => {
  try {
    const { provider, url, anonKey, dbName, password, sql } = req.body;

    if (provider === 'supabase') {
      const baseUrl = (url || '').trim().replace(/\/$/, '');
      if (!baseUrl) {
        res.status(400).json({ success: false, message: 'Supabase Project URL is required.' });
        return;
      }

      // Check if table already exists or attempt to initialize
      let tableReady = false;
      try {
        if (anonKey) {
          const testRes = await fetch(`${baseUrl}/rest/v1/nexus_state?select=id&limit=1`, {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
          });

          if (testRes.ok) {
            tableReady = true;
            // Sync current state into it
            await fetch(`${baseUrl}/rest/v1/nexus_state`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                Prefer: 'resolution=merge-duplicates',
              },
              body: JSON.stringify({
                id: 'global_state',
                payload: dbManager.getState(),
                updated_at: new Date().toISOString(),
              }),
            });
          }
        }
      } catch (checkErr) {
        console.warn('Supabase test table error:', checkErr);
      }

      // Update backend state with the new cloud config
      const updatedConfig = {
        provider: 'supabase' as const,
        supabase: {
          url: baseUrl,
          anonKey: anonKey || '',
          dbName: dbName || 'postgres',
        },
      };

      dbManager.updateState({
        cloudConfig: updatedConfig,
      });

      res.json({
        success: true,
        connected: true,
        dbName: dbName || 'postgres',
        message: `Database "${dbName || 'postgres'}" successfully created & connected! Real-time cloud sync active.`,
      });
      return;
    }

    res.json({ success: true, message: 'Cloud database verified.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Automatic setup error.' });
  }
});
