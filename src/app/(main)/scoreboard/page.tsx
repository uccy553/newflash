
import { Scoreboard } from '@/components/dashboard/scoreboard';

export default function ScoreboardPage() {
  return (
    <div className="w-full space-y-8"> {/* Ensure the page container takes full width */}
      <Scoreboard />
    </div>
  );
}
