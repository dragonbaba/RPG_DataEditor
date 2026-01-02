/**
 * Animation System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MotionCommand, 
  Motion, 
  MotionGroup, 
  GlobalMotion,
  createMotion,
  animate
} from './animation';

describe('MotionCommand', () => {
  let command: MotionCommand;

  beforeEach(() => {
    command = new MotionCommand();
  });

  it('should initialize with default values', () => {
    expect(command.count).toBe(0);
    expect(command.totalFrames).toBe(0);
    expect(command.startValues.length).toBe(8);
    expect(command.changeValues.length).toBe(8);
    expect(command.resultValues.length).toBe(8);
  });

  it('should add animation properties', () => {
    command.setAnimation(0, 100, 'linear');
    expect(command.count).toBe(1);
    expect(command.startValues[0]).toBe(0);
    expect(command.changeValues[0]).toBe(100);
  });

  it('should chain setAnimation calls', () => {
    command
      .setAnimation(0, 100, 'linear')
      .setAnimation(1, 0, 'easeOutQuad')
      .setFrames(30);
    
    expect(command.count).toBe(2);
    expect(command.totalFrames).toBe(30);
  });

  it('should limit to 8 properties', () => {
    for (let i = 0; i < 10; i++) {
      command.setAnimation(i, i + 1, 'linear');
    }
    expect(command.count).toBe(8);
  });

  it('should reset correctly', () => {
    command.setAnimation(0, 100, 'linear').setFrames(60);
    command.reset();
    
    expect(command.count).toBe(0);
    expect(command.totalFrames).toBe(0);
    expect(command.easingFuncs.length).toBe(0);
  });
});

describe('Motion', () => {
  let motion: Motion;

  beforeEach(() => {
    motion = new Motion();
  });

  it('should create commands', () => {
    motion.newCommand();
    expect(motion.commandSize).toBe(1);
    expect(motion.currentCommand).not.toBeNull();
  });

  it('should chain animation setup', () => {
    motion
      .setAnimation(0, 100, 'linear')
      .setAnimation(1, 0, 'easeOutQuad')
      .setFrames(30);
    
    expect(motion.commandSize).toBe(1);
    expect(motion.currentCommand?.count).toBe(2);
    expect(motion.currentCommand?.totalFrames).toBe(30);
  });

  it('should animate and call update callback', () => {
    const values: number[] = [];
    
    motion
      .setAnimation(0, 100, 'linear')
      .setFrames(10)
      .onUpdate((result) => {
        values.push(result[0]);
      })
      .start();
    
    // Run 5 frames
    for (let i = 0; i < 5; i++) {
      motion.animate();
    }
    
    expect(values.length).toBe(5);
    expect(values[0]).toBeCloseTo(10, 1); // 10% progress
    expect(values[4]).toBeCloseTo(50, 1); // 50% progress
  });

  it('should call complete callback when done', () => {
    let completed = false;
    
    motion
      .setAnimation(0, 100, 'linear')
      .setFrames(3)
      .onComplete(() => {
        completed = true;
      })
      .autoReturn(false)
      .start();
    
    // Run all frames
    for (let i = 0; i < 4; i++) {
      motion.animate();
    }
    
    expect(completed).toBe(true);
  });

  it('should support multiple commands', () => {
    const values: number[] = [];
    
    motion
      .newCommand()
      .setAnimation(0, 50, 'linear')
      .setFrames(2)
      .endCommand()
      .newCommand()
      .setAnimation(50, 100, 'linear')
      .setFrames(2)
      .endCommand()
      .onUpdate((result) => {
        values.push(result[0]);
      })
      .autoReturn(false)
      .start();
    
    // Run all frames
    for (let i = 0; i < 5; i++) {
      motion.animate();
    }
    
    expect(values.length).toBe(4);
    expect(values[1]).toBeCloseTo(50, 1); // End of first command
    expect(values[3]).toBeCloseTo(100, 1); // End of second command
  });

  it('should reset correctly', () => {
    motion
      .setAnimation(0, 100, 'linear')
      .setFrames(30)
      .start();
    
    motion.reset();
    
    expect(motion.commandSize).toBe(0);
    expect(motion.currentFrame).toBe(0);
    expect(motion.isRunning).toBe(false);
  });
});

describe('MotionGroup', () => {
  let group: MotionGroup;

  beforeEach(() => {
    group = new MotionGroup();
  });

  it('should create and manage motions', () => {
    const motion = group.getMotion();
    expect(group.count).toBe(1);
    expect(motion).toBeInstanceOf(Motion);
  });

  it('should update all motions', () => {
    const values1: number[] = [];
    const values2: number[] = [];
    
    group.newCommand()
      .setAnimation(0, 100, 'linear')
      .setFrames(5)
      .onUpdate((r) => values1.push(r[0]))
      .autoReturn(false)
      .start();
    
    group.newCommand()
      .setAnimation(100, 0, 'linear')
      .setFrames(5)
      .onUpdate((r) => values2.push(r[0]))
      .autoReturn(false)
      .start();
    
    // Update all
    for (let i = 0; i < 3; i++) {
      group.update();
    }
    
    expect(values1.length).toBe(3);
    expect(values2.length).toBe(3);
  });

  it('should clear all motions', () => {
    group.getMotion();
    group.getMotion();
    expect(group.count).toBe(2);
    
    group.clear();
    expect(group.count).toBe(0);
  });
});

describe('GlobalMotion', () => {
  beforeEach(() => {
    GlobalMotion.clear();
  });

  it('should be a singleton MotionGroup', () => {
    expect(GlobalMotion).toBeInstanceOf(MotionGroup);
  });

  it('should work with createMotion helper', () => {
    const motion = createMotion();
    expect(motion).toBeInstanceOf(Motion);
    expect(GlobalMotion.count).toBe(1);
  });

  it('should work with animate helper', () => {
    const values: number[] = [];
    
    const motion = animate(
      0, 100, 5, 'linear',
      (r) => values.push(r[0])
    );
    
    expect(motion).toBeInstanceOf(Motion);
    expect(motion.isRunning).toBe(true);
    
    // Run some frames
    for (let i = 0; i < 3; i++) {
      GlobalMotion.update();
    }
    
    expect(values.length).toBe(3);
  });
});

describe('Easing Integration', () => {
  it('should apply easing functions correctly', () => {
    const motion = new Motion();
    const values: number[] = [];
    
    motion
      .setAnimation(0, 100, 'easeInQuad')
      .setFrames(10)
      .onUpdate((r) => values.push(r[0]))
      .autoReturn(false)
      .start();
    
    // Run all frames
    for (let i = 0; i < 10; i++) {
      motion.animate();
    }
    
    // easeInQuad should start slow
    expect(values[0]).toBeLessThan(10); // Less than linear 10%
    expect(values[9]).toBeCloseTo(100, 1); // Should reach 100
  });
});
