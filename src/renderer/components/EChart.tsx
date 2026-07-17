import { useEffect, useRef, type CSSProperties } from 'react';
import * as echarts from 'echarts';

export function EChart({ option, style, className }: { option: echarts.EChartsOption; style?: CSSProperties; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (ref.current && !chart.current) chart.current = echarts.init(ref.current);
    chart.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    const onResize = () => chart.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: '200px', ...style }} />
  );
}
