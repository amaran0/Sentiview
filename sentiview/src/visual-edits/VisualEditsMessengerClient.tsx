"use client";

import { useEffect } from "react";
import { VisualEditsMessenger } from "./VisualEditsMessenger";

export default function VisualEditsMessengerClient() {
  useEffect(() => {
    const unsubscribe = VisualEditsMessenger.on("edit", (payload) => {
      // handle edit message
      console.log("Received edit message:", payload);
    });
    return unsubscribe;
  }, []);

  return null;
}