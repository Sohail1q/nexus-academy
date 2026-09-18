import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { AppState } from '../types';
import { INITIAL_APP_STATE } from '../services/cloudSync';

class DatabaseManager extends EventEmitter {
  private dbFilePath: string;
  private state: AppState;

  constructor() {
    super();
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'nexus-db.json');
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): AppState {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.students)) {
          return parsed as AppState;
        }
      }
    } catch (err) {
      console.error('Error reading nexus-db.json, re-initializing:', err);
    }

    // Seed initial state
    this.saveToDisk(INITIAL_APP_STATE);
    return INITIAL_APP_STATE;
  }

  private saveToDisk(state: AppState) {
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('Error writing nexus-db.json:', err);
    }
  }

  public getState(): AppState {
    return this.state;
  }

  public updateState(newState: Partial<AppState>): AppState {
    this.state = {
      ...this.state,
      ...newState,
    };
    this.saveToDisk(this.state);
    this.emit('state-changed', this.state);
    return this.state;
  }

  public addMonthlyFeeCharge(studentId: string, amount: number, note?: string): AppState {
    const students = [...this.state.students];
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx >= 0) {
      const current = students[idx];
      const prevDues = current.dues || 0;
      const newDues = prevDues + amount;
      students[idx] = {
        ...current,
        dues: newDues,
      };

      const transactions = this.state.feeTransactions || [];
      const newTx = {
        id: 'FEE-CHG-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        studentId: current.id,
        studentName: current.name,
        type: 'charge_monthly' as const,
        amount,
        prevDues,
        newDues,
        note: note || 'Monthly tuition fee charged',
      };

      return this.updateState({
        students,
        feeTransactions: [newTx, ...transactions],
      });
    }
    return this.state;
  }
}

export const dbManager = new DatabaseManager();
