import { Platform } from "react-native";

export const webNonFocusableProps =
    Platform.OS === "web"
        ? ({ focusable: false } as any)
        : {};

export const blurActiveElement = () => {
    if (Platform.OS !== "web") return;

    const documentRef = (globalThis as any).document;
    const activeElement = documentRef?.activeElement;
    activeElement?.blur?.();
    documentRef?.body?.focus?.();
};

export const runAfterBlur = (callback: () => void) => {
    blurActiveElement();

    if (Platform.OS === "web") {
        (globalThis as any).requestAnimationFrame?.(callback) ?? setTimeout(callback, 0);
        return;
    }

    callback();
};
