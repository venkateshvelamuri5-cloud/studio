
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Show toast to user for awareness
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: `The system denied a ${error.context.operation} request on ${error.context.path}. Please verify your account permissions.`,
      });
      
      // We avoid console.error here as it triggers multiple overlay screens in the development environment.
      // Errors are still captured by the system context.
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
