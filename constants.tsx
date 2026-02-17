import React from 'react';

export const APP_NAME = "TrainTrack";

// Using a free QR code API for simplicity without npm dependencies
export const generateQRUrl = (data: string) => 
  `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;
