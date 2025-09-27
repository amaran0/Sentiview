type MessagePayload = {
  type: string;
  [key: string]: any;
};

export class VisualEditsMessenger {
  static send(payload: MessagePayload) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: "visual-edits", ...payload }, "*");
    }
  }

  static on(type: string, handler: (payload: MessagePayload) => void) {
    function listener(event: MessageEvent) {
      if (
        event.data &&
        event.data.source === "visual-edits" &&
        event.data.type === type
      ) {
        handler(event.data);
      }
    }
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }
}