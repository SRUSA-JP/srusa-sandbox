import { useCallback, useRef } from 'react';
import { GRAVITY_DRAG, GRAVITY_PHYSICS } from '../map/config';
import { gravityDegree, gravityFollowers, gravityNodeRepulsion } from '../map/gravityDrag';
import type { GravityEdge, MapLayout } from '../map/layout';

interface FollowTarget {
  /** 掴んだ瞬間の、掴んだノードからの相対位置。これを保つと「つられて動く」形になる。 */
  offsetX: number;
  offsetY: number;
  attraction: number;
  velocityX: number;
  velocityY: number;
}

/**
 * 「関連度ベースの重力アルゴリズム」のドラッグ追従（TODO.md 参照）。
 *
 * 掴んだノードにつられて動く相手を、毎フレーム速度積分で動かす。
 * 静止レイアウトの座標そのものは map/layout.ts の placeGravity が決め、
 * ここはドラッグしている最中だけの、見た目の追従を受け持つ。
 *
 * 掴んだノード自身は呼び出し側（RelationshipMap の既存の掴んで動かす処理）が
 * 動かす。layout は描画のたびに新しく作られるので、最新の座標は ref 経由で
 * 毎フレーム読み直す。
 */
export function useGravityFollow(
  layoutRef: React.RefObject<MapLayout | null>,
  edges: GravityEdge[],
  onMovePerson: (personId: string, x: number, y: number) => void,
) {
  const frame = useRef<number | null>(null);
  const targets = useRef<Map<string, FollowTarget> | null>(null);
  const grabbedIdRef = useRef<string | null>(null);
  const degree = useRef<Map<string, number>>(new Map());

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    targets.current = null;
    grabbedIdRef.current = null;
  }, []);

  const start = useCallback(
    (grabbedId: string) => {
      const layout = layoutRef.current;
      if (!layout || edges.length === 0) return;
      const grabbed = layout.byId.get(grabbedId);
      if (!grabbed) return;

      degree.current = gravityDegree(edges);
      const nextTargets = new Map<string, FollowTarget>();
      for (const { id, attraction } of gravityFollowers(edges, grabbedId)) {
        const place = layout.byId.get(id);
        if (!place) continue;
        nextTargets.set(id, {
          offsetX: place.x - grabbed.x,
          offsetY: place.y - grabbed.y,
          attraction,
          velocityX: 0,
          velocityY: 0,
        });
      }
      if (nextTargets.size === 0) return;

      targets.current = nextTargets;
      grabbedIdRef.current = grabbedId;
      let lastTime: number | null = null;

      /*
       * requestAnimationFrame は「1 秒に 60 回」とは限らない（表示のリフレッシュ
       * レートや、実描画の無いヘッドレス環境ではもっと速く/遅く呼ばれる）。
       * 仕様の定数（timeStep・damping・maxSpeed）は 60fps の 1 フレームぶんを
       * 前提にしているので、実際に経過した時間を 60fps の何フレームぶんかに
       * 換算し（framesElapsed）、その分だけ力・減衰・上限をまとめて掛ける。
       * こうしないと、フレームが速く来る環境ほど同じ時間で大きく動きすぎて発散する。
       */
      const step = (now: number) => {
        const framesElapsed = lastTime === null ? 1 : Math.min(4, Math.max(0, (now - lastTime) / (1000 / 60)));
        lastTime = now;

        const currentLayout = layoutRef.current;
        const currentTargets = targets.current;
        const currentGrabbedId = grabbedIdRef.current;
        if (!currentLayout || !currentTargets || !currentGrabbedId) return;
        const anchor = currentLayout.byId.get(currentGrabbedId);
        if (!anchor) return;

        for (const [id, target] of currentTargets) {
          const place = currentLayout.byId.get(id);
          if (!place) continue;

          /* バネ力: 掴んだノードから見た目標位置（掴んだ瞬間の相対位置を保つ）へ */
          const targetX = anchor.x + target.offsetX;
          const targetY = anchor.y + target.offsetY;
          let forceX = (targetX - place.x) * (target.attraction * GRAVITY_DRAG.springScale);
          let forceY = (targetY - place.y) * (target.attraction * GRAVITY_DRAG.springScale);

          /* 反発力: 全ノードとの重なりを避ける */
          for (const other of currentLayout.people) {
            if (other.person.id === id) continue;
            const dx = place.x - other.x;
            const dy = place.y - other.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const repulsion = gravityNodeRepulsion(degree.current.get(other.person.id) ?? 0);
            const force = (GRAVITY_DRAG.repulsionScale * repulsion) / (distance * distance);
            forceX += (dx / distance) * force;
            forceY += (dy / distance) * force;
          }

          target.velocityX =
            (target.velocityX + forceX * GRAVITY_PHYSICS.timeStep * framesElapsed) *
            GRAVITY_PHYSICS.damping ** framesElapsed;
          target.velocityY =
            (target.velocityY + forceY * GRAVITY_PHYSICS.timeStep * framesElapsed) *
            GRAVITY_PHYSICS.damping ** framesElapsed;
          const maxSpeed = GRAVITY_PHYSICS.maxSpeed * framesElapsed;
          const speed = Math.hypot(target.velocityX, target.velocityY);
          if (speed > maxSpeed) {
            target.velocityX = (target.velocityX / speed) * maxSpeed;
            target.velocityY = (target.velocityY / speed) * maxSpeed;
          }
          onMovePerson(id, place.x + target.velocityX * framesElapsed, place.y + target.velocityY * framesElapsed);
        }

        frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [edges, layoutRef, onMovePerson],
  );

  return { start, stop };
}
