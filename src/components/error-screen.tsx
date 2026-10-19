import { router, type ErrorBoundaryProps } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen } from '@/components/ui';

/**
 * Shown by expo-router instead of crashing when a screen throws while rendering.
 * Exported as `ErrorBoundary` from route files.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  return (
    <Screen title="Oups">
      <Card>
        <ThemedText type="smallBold">Cet écran a rencontré une erreur.</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tes données ne sont pas perdues. Fais une capture de ce message pour que le bug soit corrigé :
        </ThemedText>
        <ThemedText type="small" selectable>
          {error.message}
        </ThemedText>
        <Button label="Réessayer" onPress={retry} />
        <Button label="Retour à l’accueil" variant="secondary" onPress={() => router.replace('/')} />
      </Card>
    </Screen>
  );
}
