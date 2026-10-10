export const DEMO_VIDEO = {
  sources: [
    { src: '/video/demo.mp4', type: 'video/mp4; codecs="avc1.64002A"' },
    { src: '/video/demo.webm', type: 'video/webm; codecs="vp9"' },
  ],
  poster: '/video/poster.jpg',
  fps: 60,
  steps: 13,
  stepsUrl: 'https://github.com/Avijit07x/cursorcam/blob/main/site/demo/readme-steps.json',
  label:
    'Demo video. Claude creates an issue in a sample issue tracker with a title, description, priority and assignee, opens it and posts a comment.',
} as const;
