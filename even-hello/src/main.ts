import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

const bridge = await waitForEvenAppBridge();

async function renderApp() {
  const result = await bridge.createStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [{
      xPosition: 100,
      yPosition: 100,
      width: 350,
      height: 60,
      containerID: 1,
      containerName: 'hello',
      content: 'Hello World!',
      isEventCapture: 1,
    }],
  });

  console.log('Container result:', result); // 0 = succes
}

// onLaunchSource wordt niet altijd gefired in de simulator — roep renderApp direct aan
bridge.onLaunchSource((source) => {
  console.log('Gelanceerd vanuit:', source);
  renderApp();
});

// Fallback voor de simulator: render meteen
renderApp();

bridge.onEvenHubEvent((event) => {
  if (event.sysEvent) {
    console.log('Event:', event.sysEvent.eventType);
  }
});