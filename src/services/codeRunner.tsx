/**
 * Runs lesson snippets in a hidden WebView (native). Each run gets a fresh page,
 * so snippets cannot see each other, and runs off the app's JS thread, so a
 * snippet that never finishes cannot freeze the app.
 *
 * Mount <CodeRunnerHost /> once near the root; call runCode() from anywhere.
 * The web build uses ./codeRunner.web.ts instead.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  TIMED_OUT,
  WATCHDOG_MS,
  buildRunnerHtml,
  failedToStart,
  isRunnerNavigationAllowed,
  parseRunResult,
  type RunCode,
  type RunResult,
} from './runnerHarness';

interface Run {
  id: number;
  html: string;
  resolve: (result: RunResult) => void;
}

let startRun: ((run: Run) => void) | null = null;
let nextId = 1;

export const runCode: RunCode = (code, options) =>
  new Promise(resolve => {
    if (!startRun) return resolve(failedToStart('песочница для кода не запущена'));
    startRun({ id: nextId++, html: buildRunnerHtml({ code, setup: options?.setup }), resolve });
  });

export function CodeRunnerHost() {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    startRun = run => setRuns(current => [...current, run]);
    return () => {
      startRun = null;
    };
  }, []);

  const done = (run: Run, result: RunResult) => {
    run.resolve(result);
    setRuns(current => current.filter(r => r.id !== run.id));
  };

  return (
    <View pointerEvents="none" style={styles.host} importantForAccessibility="no-hide-descendants">
      {runs.map(run => (
        <RunnerPage key={run.id} run={run} onDone={done} />
      ))}
    </View>
  );
}

function RunnerPage({ run, onDone }: { run: Run; onDone: (run: Run, r: RunResult) => void }) {
  const settled = useRef(false);
  const finish = (result: RunResult) => {
    if (settled.current) return;
    settled.current = true;
    onDone(run, result);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const timer = setTimeout(() => finishRef.current(TIMED_OUT), WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, []);

  const crashed = () => finish(failedToStart('песочница для кода остановилась'));

  return (
    <WebView
      style={styles.page}
      source={{ html: run.html, baseUrl: 'about:blank' }}
      // Every URL must reach onShouldStartLoadWithRequest below: react-native-webview
      // hands URLs outside originWhitelist to Linking.openURL (the system browser),
      // so a narrower list would let a snippet open any site.
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={request => isRunnerNavigationAllowed(request.url)}
      setSupportMultipleWindows={false}
      javaScriptCanOpenWindowsAutomatically={false}
      javaScriptEnabled
      domStorageEnabled={false}
      cacheEnabled={false}
      incognito
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      allowsLinkPreview={false}
      mixedContentMode="never"
      geolocationEnabled={false}
      onMessage={event => {
        const result = parseRunResult(event.nativeEvent.data);
        if (result) finish(result);
      }}
      onError={() => finish(failedToStart('не удалось запустить песочницу для кода'))}
      onRenderProcessGone={crashed}
      onContentProcessDidTerminate={crashed}
    />
  );
}

const styles = StyleSheet.create({
  // Kept on screen at 1×1 px: some WebViews throttle timers in zero-sized pages.
  host: { position: 'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0 },
  page: { width: 1, height: 1, backgroundColor: 'transparent' },
});
