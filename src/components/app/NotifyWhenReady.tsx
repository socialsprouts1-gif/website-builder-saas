'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * "Tell me when it is ready."
 *
 * A build runs for minutes and people put the phone down, which is the correct
 * thing to do and also the moment the product goes quiet. The email covers
 * somebody who closed the tab; this covers somebody who switched to WhatsApp,
 * where a notification arrives in two seconds rather than two minutes.
 *
 * Permission is asked for on a tap, never on arrival. A page that demands
 * notifications before it has done anything is a page people say no to once and
 * then cannot say yes to again without digging through browser settings.
 */
export function NotifyWhenReady() {
  const [state, setState] = useState<'unsupported' | 'idle' | 'granted' | 'denied'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setState('unsupported');
      return;
    }
    const permission = Notification.permission;
    setState(permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'idle');
  }, []);

  if (state === 'unsupported' || state === 'denied') return null;

  if (state === 'granted') {
    return (
      <p className="mt-5 text-[14px] text-ink-muted">
        You will get a notification when it is done — go and do something else.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            const permission = await Notification.requestPermission();
            setState(permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'idle');
          } catch {
            setState('unsupported');
          }
        }}
      >
        Notify me when it is ready
      </Button>
      <p className="mt-2 text-[14px] text-ink-muted">
        Then you can close this and carry on. We will email you either way.
      </p>
    </div>
  );
}

/**
 * Fires the notification, if one was asked for and the tab is not being looked
 * at. Showing one to somebody already watching the screen is noise.
 */
export function notifyBuilt(name: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    const notification = new Notification(`${name} is ready`, {
      body: 'Your website is built. Tap to open it.',
      icon: '/icon.png',
      tag: 'lumen-build',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers throw on construction rather than refusing politely.
  }
}
