
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In development, we want to see these clearly
      toast({
        variant: 'destructive',
        title: 'Security Rule Denied',
        description: `Operation: ${error.context.operation} on ${error.context.path}. Check your Firestore rules.`,
      });
      
      // Log for the agentive loop
      console.error('Firebase Security Error Context:', JSON.stringify(error.context, null, 2));
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
