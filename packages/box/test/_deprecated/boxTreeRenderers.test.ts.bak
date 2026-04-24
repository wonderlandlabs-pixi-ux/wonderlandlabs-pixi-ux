import { describe, expect, it } from 'vitest';
import { BoxTree } from '../src/BoxTree';
import { boxTreeToSvg } from '../src/boxTreeRenderers';

describe('boxTreeRenderers', () => {
  describe('boxTreeToSvg', () => {
    it('renders root and children as rect elements by default', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 100, height: 80 },
        children: {
          child: {
            area: { x: 5, y: 6, width: 20, height: 10 },
          },
        },
      });

      const svg = boxTreeToSvg(root);

      expect(svg).toContain('<svg ');
      expect(svg).toContain('data-path="root"');
      expect(svg).toContain('data-path="root/child"');
      expect((svg.match(/<rect /g) ?? []).length).toBe(2);
    });

    it('supports includeRoot=false', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 80 },
        children: {
          child: {
            area: { x: 0, y: 0, width: 20, height: 10 },
          },
        },
      });

      const svg = boxTreeToSvg(root, { includeRoot: false });

      expect(svg).not.toContain('data-path="root"');
      expect(svg).toContain('data-path="root/child"');
      expect((svg.match(/<rect /g) ?? []).length).toBe(1);
    });

    it('supports background, padding, and per-node style overrides', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 50, height: 50 },
      });

      const svg = boxTreeToSvg(root, {
        background: '#f0f0f0',
        padding: 10,
        nodeToStyle: () => ({
          fill: '#ff0000',
          stroke: '#00ff00',
          strokeWidth: 2,
        }),
      });

      expect(svg).toContain('fill="#f0f0f0"');
      expect(svg).toContain('fill="#ff0000"');
      expect(svg).toContain('stroke="#00ff00"');
      expect(svg).toContain('stroke-width="2"');
      expect(svg).toContain('viewBox="-10 -10 70 70"');
    });

    it('writes content metadata to svg nodes when content exists', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 80 },
        content: { type: 'text', value: 'hello world' },
      });

      const svg = boxTreeToSvg(root);

      expect(svg).toContain('data-content-type="text"');
      expect(svg).toContain('data-content-value="hello world"');
    });
  });
});
