import { StatusScreen } from '@/components/status/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="Nothing here"
      accent="yet."
      message="That page does not exist. It may have been a site you deleted, or a link that moved."
      detail="If you followed a link from somewhere on Lumen, tell us — a broken link of ours is a bug."
      actions={[
        { href: '/app', label: 'Your sites' },
        { href: '/support', label: 'Report the link', tone: 'quiet' },
        { href: '/', label: 'Back home', tone: 'quiet' },
      ]}
    />
  );
}
