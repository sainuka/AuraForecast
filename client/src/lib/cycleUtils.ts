export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export function calculateCyclePhase(periodStartDate: Date, avgCycleLength: number = 28): CyclePhase {
  const today = new Date();
  const dayOfCycle = Math.floor((today.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  if (dayOfCycle <= 5) {
    return 'menstrual';
  } else if (dayOfCycle <= 13) {
    return 'follicular';
  } else if (dayOfCycle <= 16) {
    return 'ovulation';
  } else {
    return 'luteal';
  }
}

export function getCyclePhaseInfo(phase: CyclePhase) {
  const phaseInfo = {
    menstrual: {
      name: 'Menstrual',
      description: 'Period phase - energy may be lower, focus on rest and gentle movement',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    },
    follicular: {
      name: 'Follicular',
      description: 'Energy building phase - great time for new projects and intense workouts',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    ovulation: {
      name: 'Ovulation',
      description: 'Peak energy phase - optimal for high-intensity activities and socializing',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    luteal: {
      name: 'Luteal',
      description: 'Energy winding down - time for self-care and lighter activities',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
  };

  return phaseInfo[phase];
}

export function predictNextPeriod(lastPeriodDate: Date, avgCycleLength: number = 28): Date {
  const nextPeriod = new Date(lastPeriodDate);
  nextPeriod.setDate(nextPeriod.getDate() + avgCycleLength);
  return nextPeriod;
}
