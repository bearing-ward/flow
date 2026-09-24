import { FlowAttribute, FlowSpan } from "@flow/core";
import type { Scope } from "effect";
import { Context, Effect, Layer } from "effect";

import { BrowserCapabilityError } from "./browser-capability-error.ts";

export { BrowserCapabilityError } from "./browser-capability-error.ts";

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

export interface ResizeObservation {
  readonly observe: (element: Element) => void;
  readonly unobserve: (element: Element) => void;
}

export interface FlowBrowserService {
  readonly listen: <K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ) => Effect.Effect<void, never, Scope.Scope>;
  readonly listenWindow: <K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ) => Effect.Effect<void, never, Scope.Scope>;
  readonly observeResize: (
    listener: (entries: readonly ResizeObserverEntry[]) => void
  ) => Effect.Effect<ResizeObservation, BrowserCapabilityError, Scope.Scope>;
  readonly measure: (element: HTMLElement) => ElementSize;
  readonly focus: (element: HTMLElement) => Effect.Effect<void>;
  readonly requestAnimationFrame: (
    callback: FrameRequestCallback
  ) => Effect.Effect<number, never, Scope.Scope>;
  readonly capturePointer: (
    element: HTMLElement,
    pointerId: number
  ) => Effect.Effect<boolean>;
  readonly releasePointer: (
    element: HTMLElement,
    pointerId: number
  ) => Effect.Effect<boolean>;
}

export class FlowBrowser extends Context.Service<
  FlowBrowser,
  FlowBrowserService
>()("@flow/vanilla/FlowBrowser") {}

const listen: FlowBrowserService["listen"] = (
  target,
  type,
  listener,
  options
) =>
  Effect.acquireRelease(
    Effect.sync(() => target.addEventListener(type, listener, options)),
    () => Effect.sync(() => target.removeEventListener(type, listener, options))
  );

const listenWindow: FlowBrowserService["listenWindow"] = (
  target,
  type,
  listener,
  options
) =>
  Effect.acquireRelease(
    Effect.sync(() => target.addEventListener(type, listener, options)),
    () => Effect.sync(() => target.removeEventListener(type, listener, options))
  );

const pointerOperation = (
  operation: "capture" | "release",
  element: HTMLElement,
  pointerId: number
): Effect.Effect<boolean> => {
  const recoverPointerOperation = (error: BrowserCapabilityError) =>
    Effect.logWarning("Browser pointer operation failed").pipe(
      Effect.annotateLogs({
        [FlowAttribute.browserCapability]: error.capability,
        [FlowAttribute.browserOperation]: error.operation,
        [FlowAttribute.pointerId]: pointerId,
      }),
      Effect.as(false)
    );

  return Effect.try({
    catch: (cause) =>
      new BrowserCapabilityError({
        capability: "pointer-capture",
        operation,
        cause,
      }),
    try: () => {
      if (operation === "capture") {
        element.setPointerCapture(pointerId);
      } else if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }

      return true;
    },
  }).pipe(
    Effect.catchTag("BrowserCapabilityError", recoverPointerOperation),
    Effect.withSpan(FlowSpan.browserPointerCapture, {
      attributes: {
        [FlowAttribute.browserOperation]: operation,
        [FlowAttribute.pointerId]: pointerId,
      },
    })
  );
};

const logResizeObservationError = (error: BrowserCapabilityError) =>
  Effect.logError("Browser resize observation is unavailable").pipe(
    Effect.annotateLogs({
      [FlowAttribute.browserCapability]: error.capability,
      [FlowAttribute.browserOperation]: error.operation,
    })
  );

export const FlowBrowserLive = Layer.succeed(FlowBrowser, {
  capturePointer: (element, pointerId) =>
    pointerOperation("capture", element, pointerId),
  listen,
  listenWindow,
  measure: (element) => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
  }),
  focus: (element) => Effect.sync(() => element.focus()),
  requestAnimationFrame: (callback) =>
    Effect.acquireRelease(
      Effect.sync(() => globalThis.requestAnimationFrame(callback)),
      (frame) => Effect.sync(() => globalThis.cancelAnimationFrame(frame))
    ),
  observeResize: (listener) =>
    Effect.acquireRelease(
      Effect.try({
        try: () => {
          const observer = new ResizeObserver(listener);

          return {
            observe: (element: Element): void => observer.observe(element),
            unobserve: (element: Element): void => observer.unobserve(element),
            disconnect: (): void => observer.disconnect(),
          };
        },
        catch: (cause) =>
          new BrowserCapabilityError({
            capability: "resize-observer",
            operation: "acquire",
            cause,
          }),
      }).pipe(
        Effect.tapError(logResizeObservationError),
        Effect.withSpan(FlowSpan.browserResizeObserverAcquire)
      ),
      (observation) => Effect.sync(() => observation.disconnect())
    ),
  releasePointer: (element, pointerId) =>
    pointerOperation("release", element, pointerId),
});
