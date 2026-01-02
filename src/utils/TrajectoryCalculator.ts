
import { TrajectorySegment, EasingType } from '../types';
import { EasingFunctions } from './easing';

export interface Point {
    x: number;
    y: number;
}

export class TrajectoryCalculator {
    /**
     * Calculate the position of a projectile at a specific frame.
     * 
     * @param segments The trajectory segments configuration
     * @param currentFrame The current animation frame (0-based)
     * @param startPos The starting position {x, y}
     * @param endPos The final target position {x, y}
     * @returns The calculated {x, y} position
     */
    public static calculatePosition(
        segments: TrajectorySegment[],
        currentFrame: number,
        startPos: Point,
        endPos: Point
    ): Point {
        if (!segments || segments.length === 0) {
            return { ...startPos };
        }

        let accumulatedFrames = 0;
        let previousX = startPos.x;
        let previousY = startPos.y;

        const length = segments.length;
        const lastIndex = length - 1;

        for (let i = 0; i < length; i++) {
            const segment = segments[i];
            const duration = segment.duration;
            const isLast = i === lastIndex;

            // Determine target for this segment
            // If it's the last segment, strictly use endPos (unless legacy code behavior dictates otherwise, 
            // but legacy says `targetX = isLast ? this.tx : targetX`).
            // Intermediate segments use their own targetX/Y.
            const segmentTargetX = isLast ? endPos.x : segment.targetX;
            const segmentTargetY = isLast ? endPos.y : segment.targetY;

            // Check if current frame falls within this segment
            if (currentFrame < accumulatedFrames + duration) {
                // Calculate progress within this segment
                const t = currentFrame - accumulatedFrames;
                const progress = t / duration; // 0 to 1 (not clamped, but frame check ensures < duration)

                // Apply easing
                const easeXFunc = EasingFunctions[segment.easeX as EasingType] || EasingFunctions.linear;
                const easeYFunc = EasingFunctions[segment.easeY as EasingType] || EasingFunctions.linear;

                const easedX = easeXFunc(progress);
                const easedY = easeYFunc(progress);

                // Interpolate
                const currentX = previousX + (segmentTargetX - previousX) * easedX;
                const currentY = previousY + (segmentTargetY - previousY) * easedY;

                return { x: currentX, y: currentY };
            }

            // Prepare for next segment
            accumulatedFrames += duration;
            previousX = segmentTargetX;
            previousY = segmentTargetY;
        }

        // If we exceeded total duration, return the final position
        return { ...endPos };
    }

    /**
     * Calculate total duration of the trajectory
     */
    public static getTotalDuration(segments: TrajectorySegment[]): number {
        return segments.reduce((sum, seg) => sum + seg.duration, 0);
    }
}
