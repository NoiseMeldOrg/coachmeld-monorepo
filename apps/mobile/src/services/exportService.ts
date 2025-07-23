import { Message, UserProfile } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export class ExportService {
  /**
   * Export chat messages with user profile context
   */
  static async exportChatWithContext(
    messages: Message[],
    coachName: string,
    userProfile?: UserProfile | null,
    format: 'text' | 'html' | 'json' = 'text'
  ): Promise<string> {
    const exportDate = new Date().toLocaleDateString();
    const exportTime = new Date().toLocaleTimeString();

    if (format === 'json') {
      return JSON.stringify({
        export: {
          type: 'chat',
          coach: coachName,
          date: exportDate,
          time: exportTime,
          user: userProfile ? {
            name: userProfile.name,
            age: userProfile.age,
            dietType: userProfile.dietType,
            goals: userProfile.healthGoals
          } : null,
          messages: messages.map(m => ({
            timestamp: m.timestamp.toISOString(),
            sender: m.sender,
            text: m.text
          }))
        }
      }, null, 2);
    }

    if (format === 'html') {
      return this.generateChatHTML(messages, coachName, userProfile, exportDate);
    }

    // Default text format with header
    let text = `CoachMeld Chat Export\n`;
    text += `Coach: ${coachName}\n`;
    text += `Date: ${exportDate} ${exportTime}\n`;
    
    if (userProfile?.name) {
      text += `User: ${userProfile.name}\n`;
      if (userProfile.dietType) {
        text += `Diet Type: ${this.formatDietType(userProfile.dietType)}\n`;
      }
    }
    
    text += `\n${'='.repeat(50)}\n\n`;
    
    text += messages.map(m => 
      `[${m.timestamp.toLocaleString()}] ${m.sender === 'user' ? 'You' : coachName}: ${m.text}`
    ).join('\n\n');
    
    return text;
  }

  /**
   * Generate HTML for chat export
   */
  private static generateChatHTML(
    messages: Message[],
    coachName: string,
    userProfile: UserProfile | null | undefined,
    exportDate: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoachMeld - ${coachName} Chat Export</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #eee;
    }
    .header h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .header .coach-name {
      color: #007AFF;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .header .export-info {
      color: #666;
      font-size: 14px;
    }
    .user-info {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .user-info h3 {
      margin-top: 0;
      color: #333;
    }
    .user-info p {
      margin: 5px 0;
      color: #666;
    }
    .messages {
      max-width: 600px;
      margin: 0 auto;
    }
    .message {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
    }
    .message.user {
      align-items: flex-end;
    }
    .message.coach {
      align-items: flex-start;
    }
    .message-bubble {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 18px;
      position: relative;
    }
    .message.user .message-bubble {
      background-color: #007AFF;
      color: white;
    }
    .message.coach .message-bubble {
      background-color: #E5E5EA;
      color: #333;
    }
    .timestamp {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
      padding: 0 8px;
    }
    @media print {
      body { background-color: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CoachMeld Chat Export</h1>
      <div class="coach-name">${coachName}</div>
      <div class="export-info">Exported on ${exportDate}</div>
    </div>
    
    ${userProfile ? `
    <div class="user-info">
      <h3>User Information</h3>
      <p><strong>Name:</strong> ${userProfile.name || 'Not provided'}</p>
      ${userProfile.dietType ? `<p><strong>Diet Type:</strong> ${this.formatDietType(userProfile.dietType)}</p>` : ''}
      ${userProfile.healthGoals.length > 0 ? `<p><strong>Health Goals:</strong> ${userProfile.healthGoals.join(', ')}</p>` : ''}
    </div>
    ` : ''}
    
    <div class="messages">
      ${messages.map(m => `
        <div class="message ${m.sender}">
          <div class="message-bubble">
            ${m.text}
          </div>
          <div class="timestamp">
            ${m.timestamp.toLocaleString()}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Save export to device and share
   */
  static async saveAndShare(
    content: string,
    filename: string,
    mimeType: string = 'text/plain'
  ): Promise<void> {
    try {
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: 'Export CoachMeld Data',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error saving/sharing file:', error);
      throw error;
    }
  }

  /**
   * Format diet type for display
   */
  private static formatDietType(dietType: string): string {
    const dietMap: Record<string, string> = {
      paleo: 'Paleo',
      lowcarb: 'Low Carb',
      keto: 'Ketogenic',
      ketovore: 'Ketovore',
      carnivore: 'Carnivore',
      lion: 'Lion Diet'
    };
    return dietMap[dietType] || dietType;
  }
}