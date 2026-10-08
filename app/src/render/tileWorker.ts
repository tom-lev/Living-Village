/* נקודת הכניסה של ה-Worker שמצייר אריחים ברקע */
import { createPainter } from './tilePainter';

const w: any = self;
const handle = createPainter((m, transfer) => w.postMessage(m, transfer || []));
w.onmessage = (e: MessageEvent) => handle(e.data);
(self as any).postMessage({ type: 'hi' });   // נטען: הדף יכול להמשיך לבנות את העולם
