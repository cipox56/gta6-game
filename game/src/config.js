// Neon Bay Heist — game tuning, city layout constants and the story mission chain.
// All names, places and characters here are original inventions for this game.
export const CFG = {
  worldSize: 3200,
  roadGap: 400,
  roadWidth: 96,
  canvasW: 1280,
  canvasH: 720,
  playerRadius: 14,
  walkSpeed: 230,
  runSpeed: 330,
  carAccel: 620,
  carMaxSpeed: 560,
  carReverseMax: 220,
  carTurn: 2.6,
  carBrake: 900,
  carDrag: 0.55,
  maxHealth: 100,
  maxWanted: 5,
  saveKey: 'neonbay_heist_save_v1',
};

export const DISTRICTS = [
  { name: 'Downtown', x: 0, y: 0, w: 1600, h: 1600, tint: '#3b4a6b' },
  { name: 'Little Havana Row', x: 1600, y: 0, w: 1600, h: 1600, tint: '#7a5a3a' },
  { name: 'Marina District', x: 0, y: 1600, w: 1600, h: 1400, tint: '#2e6b6b' },
  { name: 'Palm Heights', x: 1600, y: 1600, w: 1600, h: 1400, tint: '#5b7a3a' },
];

// Story missions. Each entry: id, title, briefing from Rosa, kind, reward, time limit (0 = none).
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    brief: 'Rosa: "Welcome to Neon Bay, Dash. You need wheels. Grab any parked car and bring it to my garage."',
    kind: 'deliver-car',
    reward: 250,
    timeLimit: 0,
  },
  {
    id: 'package-run',
    title: 'Package Run',
    brief: 'Rosa: "A package is waiting at the marina. Pick it up and drop it at the boardwalk — fast. The buyer hates waiting."',
    kind: 'pickup-deliver',
    reward: 500,
    timeLimit: 75,
  },
  {
    id: 'getaway-driver',
    title: 'Getaway Driver',
    brief: 'Rosa: "Milo messed up a job downtown. Pick him up, then shake the heat. Lose the cops and reach the hideout."',
    kind: 'pickup-escape',
    reward: 800,
    timeLimit: 120,
  },
  {
    id: 'night-fares',
    title: 'Night Fares',
    brief: 'Rosa: "Easy money. Three fares are waiting around the city. Pick them up, drop them off, keep the meter running."',
    kind: 'fares',
    reward: 650,
    timeLimit: 150,
  },
  {
    id: 'the-chase',
    title: 'The Chase',
    brief: 'Rosa: "Detective Hale knows your face now. Survive the chase — stay alive and free for sixty seconds."',
    kind: 'survive',
    reward: 1000,
    timeLimit: 60,
  },
  {
    id: 'the-big-score',
    title: 'The Big Score',
    brief: 'Rosa: "Last job. The Neon Bay bank vault. Hold the vault door for ten seconds, then run for the yacht at the marina. This is it, Dash."',
    kind: 'heist',
    reward: 5000,
    timeLimit: 180,
  },
];

export const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#2c3e50', '#ff6b9d', '#7f8c8d'];
export const PED_SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#fd79a8', '#00cec9', '#fdcb6e'];
export const BUILDING_COLORS = ['#8d6e63', '#78909c', '#a1887f', '#90a4ae', '#bcaaa4', '#7e57c2', '#26a69a', '#ef6c00', '#5c6bc0', '#8e24aa'];
