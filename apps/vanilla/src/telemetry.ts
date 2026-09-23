import {
  Config,
  ConfigProvider,
  Duration,
  Effect,
  Layer,
  Logger,
  ManagedRuntime,
  Option,
  References,
} from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp } from "effect/unstable/observability";

import { FlowBrowserLive } from "./flow-browser.ts";

const BrowserTelemetryConfig = Config.all({
  endpoint: Config.option(Config.String("VITE_OTEL_EXPORTER_OTLP_ENDPOINT")),
  exportIntervalMs: Config.Int("VITE_OTEL_EXPORT_INTERVAL_MS").pipe(
    Config.withDefault(1000)
  ),
  serviceName: Config.String("VITE_OTEL_SERVICE_NAME").pipe(
    Config.withDefault("flow-vanilla")
  ),
  serviceVersion: Config.option(Config.String("VITE_OTEL_SERVICE_VERSION")),
});

const localDiagnostics = Logger.layer([
  Logger.consoleStructured,
  Logger.tracerLogger,
]);

const debugLogLevel = Layer.succeed(References.MinimumLogLevel, "Debug");

export type BrowserEnvironment = Readonly<
  Record<string, string | boolean | undefined>
>;

export const makeBrowserTelemetryLayer = (environment: BrowserEnvironment) =>
  Layer.unwrap(
    Effect.map(
      BrowserTelemetryConfig.parse(ConfigProvider.fromUnknown(environment)),
      (settings) => {
        if (Option.isNone(settings.endpoint)) {
          return Layer.merge(localDiagnostics, debugLogLevel);
        }

        const exportInterval = Duration.millis(settings.exportIntervalMs);

        const exporter = Otlp.layerJson({
          baseUrl: settings.endpoint.value,
          loggerExportInterval: exportInterval,
          metricsExportInterval: exportInterval,
          resource: {
            serviceName: settings.serviceName,
            serviceVersion: Option.getOrUndefined(settings.serviceVersion),
          },
          tracerExportInterval: exportInterval,
        }).pipe(Layer.provide(FetchHttpClient.layer));

        return Layer.merge(exporter, debugLogLevel);
      }
    )
  );

export const makeBrowserApplicationLayer = (environment: BrowserEnvironment) =>
  Layer.merge(makeBrowserTelemetryLayer(environment), FlowBrowserLive);

export const BrowserApplicationLive = makeBrowserApplicationLayer(
  import.meta.env
);

export const makeBrowserRuntime = (environment: BrowserEnvironment) =>
  ManagedRuntime.make(makeBrowserApplicationLayer(environment));
