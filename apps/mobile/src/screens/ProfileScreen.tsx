import React from 'react';
import { EditProfileScreen } from './EditProfileScreen';

export const ProfileScreen: React.FC<{ navigation?: any }> = () => {
  // Directly render EditProfileScreen content
  // Pass isFromTab=true since this is accessed from the bottom tab navigator
  return <EditProfileScreen isFromTab={true} />;
};