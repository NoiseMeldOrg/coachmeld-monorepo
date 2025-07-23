export const formatMessageTimestamp = (date: Date): string => {
  const now = new Date();
  const messageDate = new Date(date);
  
  // Reset time parts for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  // Calculate difference in days
  const diffTime = today.getTime() - msgDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Format time part (always uppercase)
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const timeStr = messageDate.toLocaleTimeString('en-US', timeOptions).toUpperCase();
  
  // Today: just show time
  if (diffDays === 0) {
    return timeStr;
  }
  
  // Within last 6 days: show day abbreviation
  if (diffDays > 0 && diffDays <= 6) {
    const dayStr = messageDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    return `${dayStr} AT ${timeStr}`;
  }
  
  // Current year: show month and day
  if (messageDate.getFullYear() === now.getFullYear()) {
    const monthStr = messageDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayNum = messageDate.getDate();
    return `${monthStr} ${dayNum} AT ${timeStr}`;
  }
  
  // Previous years: show full date
  const monthStr = messageDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = messageDate.getDate();
  const year = messageDate.getFullYear();
  return `${monthStr} ${dayNum}, ${year} AT ${timeStr}`;
};

export const shouldShowTimestamp = (currentMsg: Date, previousMsg?: Date): boolean => {
  if (!previousMsg) return true;
  
  const current = new Date(currentMsg);
  const previous = new Date(previousMsg);
  
  // Show timestamp if messages are more than 1 minute apart
  const diffMs = current.getTime() - previous.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  return diffMinutes >= 1;
};