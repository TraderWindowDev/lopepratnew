import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText, Line } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface LineChartProps {
  data: { date: string; pace: number }[];
  color?: string;
  width?: number;
  height?: number;
  inverted?: boolean;
}

export function LineChart({
  data,
  color = Colors.primary,
  width = 320,
  height = 120,
  inverted = true,
}: LineChartProps) {
  if (data.length < 2) return <View style={{ width, height }} />;

  const padT = 12;
  const padB = 24;
  const padL = 8;
  const padR = 8;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const values = data.map((d) => d.pace);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => {
    const normalized = (v - minV) / range;
    return padT + (inverted ? normalized : 1 - normalized) * chartH;
  };

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.pace) }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Path d={areaPath} fill="url(#grad)" />
        <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}

        {data.map((d, i) => (
          <SvgText
            key={i}
            x={toX(i)}
            y={height - 4}
            fontSize={9}
            fill={Colors.textMuted}
            textAnchor="middle"
          >
            {d.date}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
