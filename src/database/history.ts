/**
 * Simple file-based history storage for Agent conversations and positions
 */

import fs from 'fs';
import path from 'path';

const HISTORY_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_FILE = path.join(HISTORY_DIR, 'conversations.json');
const POSITIONS_FILE = path.join(HISTORY_DIR, 'positions.json');

// Ensure data directory exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

export class HistoryManager {
  /**
   * Save conversation to history
   */
  static saveConversation(message: any): void {
    try {
      let conversations = this.getConversations();
      conversations.push({
        ...message,
        savedAt: new Date().toISOString(),
      });

      // Keep last 1000 conversations
      if (conversations.length > 1000) {
        conversations = conversations.slice(-1000);
      }

      fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  /**
   * Get all conversations
   */
  static getConversations(): any[] {
    try {
      if (fs.existsSync(CONVERSATIONS_FILE)) {
        const data = fs.readFileSync(CONVERSATIONS_FILE, 'utf-8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }

  /**
   * Save position to history
   */
  static savePosition(position: any): void {
    try {
      let positions = this.getPositions();
      
      // Check if position already exists
      const existingIndex = positions.findIndex((p: any) => p.id === position.id);
      if (existingIndex >= 0) {
        positions[existingIndex] = {
          ...position,
          updatedAt: new Date().toISOString(),
        };
      } else {
        positions.push({
          ...position,
          createdAt: new Date().toISOString(),
        });
      }

      // Keep last 500 positions
      if (positions.length > 500) {
        positions = positions.slice(-500);
      }

      fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  }

  /**
   * Get all positions (active and closed)
   */
  static getPositions(): any[] {
    try {
      if (fs.existsSync(POSITIONS_FILE)) {
        const data = fs.readFileSync(POSITIONS_FILE, 'utf-8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Failed to load positions:', error);
      return [];
    }
  }

  /**
   * Mark position as closed
   */
  static closePosition(positionId: string, finalPnL: number): void {
    try {
      const positions = this.getPositions();
      const position = positions.find((p: any) => p.id === positionId);
      
      if (position) {
        position.status = 'CLOSED';
        position.finalPnL = finalPnL;
        position.closedAt = new Date().toISOString();
        
        fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
      }
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  }
}

