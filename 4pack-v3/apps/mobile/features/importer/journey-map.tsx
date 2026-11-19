import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { resolvePlace, resolveRoute } from "../../lib/journey";
import { Copy, colors } from "./ui";
const continents = [
  [
    [-168, 70],
    [-130, 73],
    [-100, 72],
    [-60, 50],
    [-82, 25],
    [-98, 17],
    [-120, 35],
    [-150, 58],
    [-168, 70],
  ],
  [
    [-80, 12],
    [-53, 5],
    [-35, -8],
    [-45, -30],
    [-68, -55],
    [-75, -25],
    [-80, 12],
  ],
  [
    [-18, 35],
    [10, 37],
    [40, 10],
    [50, -12],
    [20, -35],
    [10, -20],
    [-12, 4],
    [-18, 35],
  ],
  [
    [-10, 36],
    [-5, 58],
    [30, 70],
    [80, 73],
    [145, 60],
    [173, 50],
    [140, 35],
    [120, 5],
    [100, 3],
    [78, 8],
    [50, 25],
    [35, 38],
    [10, 35],
    [-10, 36],
  ],
  [
    [112, -12],
    [145, -11],
    [154, -28],
    [130, -39],
    [114, -25],
    [112, -12],
  ],
];
export function JourneyMap({
  route,
  lastMilestone,
}: {
  route?: string;
  lastMilestone?: { title: string; location: string } | null;
}) {
  const [width, setWidth] = useState(320),
    progress = useRef(new Animated.Value(0)).current;
  const resolved = resolveRoute(route),
    milestone = lastMilestone ? resolvePlace(lastMilestone.location) : null;
  const height = 230,
    pad = 16;
  const point = (lon: number, lat: number) => ({
    x: pad + ((lon + 180) / 360) * (width - 2 * pad),
    y: 18 + ((80 - lat) / 150) * (height - 42),
  });
  useEffect(() => {
    let disposed = false;
    progress.setValue(0);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (disposed) return;
      if (reduce) progress.setValue(1);
      else
        Animated.timing(progress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
    });
    return () => {
      disposed = true;
      progress.stopAnimation();
    };
  }, [route, progress]);
  const stroke = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    key: string,
    color: string,
    opacity?: Animated.AnimatedInterpolation<number>,
  ) => (
    <Animated.View
      key={key}
      style={{
        position: "absolute",
        left: (a.x + b.x) / 2 - Math.hypot(b.x - a.x, b.y - a.y) / 2,
        top: (a.y + b.y) / 2,
        width: Math.hypot(b.x - a.x, b.y - a.y),
        height: color === colors.text ? 2 : 1,
        backgroundColor: color,
        opacity: opacity ?? 1,
        transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }],
      }}
    />
  );
  const start = resolved
      ? point(resolved.origin.lon, resolved.origin.lat)
      : null,
    end = resolved
      ? point(resolved.destination.lon, resolved.destination.lat)
      : null;
  const curve = (t: number) => ({
    x: start!.x + (end!.x - start!.x) * t,
    y: start!.y + (end!.y - start!.y) * t - Math.sin(t * Math.PI) * 48,
  });
  return (
    <View style={styles.shell}>
      <View
        accessibilityLabel={
          resolved
            ? `Mapa de ${resolved.origin.name} a ${resolved.destination.name}. Ruta aproximada.`
            : "Mapa sin ruta: faltan ubicaciones reconocibles."
        }
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height, overflow: "hidden" }}
      >
        {[-120, -60, 0, 60, 120].map((lon) => (
          <View
            key={lon}
            style={{
              position: "absolute",
              left: point(lon, 0).x,
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: "#FFFFFF05",
            }}
          />
        ))}
        {[60, 30, 0, -30].map((lat) => (
          <View
            key={lat}
            style={{
              position: "absolute",
              top: point(0, lat).y,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "#FFFFFF05",
            }}
          />
        ))}
        {continents.flatMap((shape, i) =>
          shape
            .slice(1)
            .map((p, j) =>
              stroke(
                point(...(shape[j] as [number, number])),
                point(...(p as [number, number])),
                `land-${i}-${j}`,
                "#363940",
              ),
            ),
        )}
        {resolved && start && end && (
          <>
            {Array.from({ length: 36 }, (_, i) =>
              stroke(
                curve(i / 36),
                curve((i + 1) / 36),
                `route-${i}`,
                colors.text,
                progress.interpolate({
                  inputRange: [i / 36, (i + 1) / 36],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                }),
              ),
            )}
            {[
              { p: start, label: resolved.origin.name },
              { p: end, label: resolved.destination.name },
            ].map(({ p, label }) => (
              <View
                key={label}
                style={{
                  position: "absolute",
                  left: p.x - 4.5,
                  top: p.y - 4.5,
                }}
              >
                <View style={styles.pin} />
                <Copy
                  style={{
                    fontSize: 10,
                    marginTop: 5,
                    backgroundColor: colors.bg,
                    paddingHorizontal: 3,
                    width: 110,
                    left: -Math.max(0, p.x + 110 - width),
                  }}
                >
                  {label}
                </Copy>
              </View>
            ))}
            {milestone && (
              <View
                accessibilityLabel={`Último hito: ${lastMilestone!.title}, ${lastMilestone!.location}`}
                style={{
                  position: "absolute",
                  left: point(milestone.lon, milestone.lat).x - 11,
                  top: point(milestone.lon, milestone.lat).y - 11,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderColor: colors.green,
                  borderWidth: 2,
                  backgroundColor: "#34D39925",
                }}
              />
            )}
          </>
        )}
        {!resolved && (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
            }}
          >
            <Copy style={{ fontSize: 19, fontWeight: "700" }}>
              Tu próxima ruta
            </Copy>
            <Copy muted style={{ textAlign: "center", marginTop: 8 }}>
              El mapa aparece cuando podemos ubicar el origen y el destino.
            </Copy>
          </View>
        )}
      </View>
      <View
        style={{
          padding: 14,
          borderTopWidth: 1,
          borderColor: colors.line,
          gap: 5,
        }}
      >
        <Copy muted style={{ fontSize: 10, letterSpacing: 1 }}>
          {resolved
            ? "RUTA APROXIMADA · NO ES EL ITINERARIO REAL"
            : "SIN RUTA DISPONIBLE · PODÉS CONTINUAR"}
        </Copy>
        {milestone && (
          <Copy style={{ fontSize: 12, color: colors.green }}>
            Último hito registrado: {lastMilestone!.title} ·{" "}
            {lastMilestone!.location}
          </Copy>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  shell: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#111215",
    overflow: "hidden",
  },
  pin: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.card,
  },
});
