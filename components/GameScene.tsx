import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, Float, Text, Trail, MeshReflectorMaterial, Instance, Instances, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CarControls } from '../types';
import { MAX_SPEED, ACCELERATION, FRICTION, TURN_SPEED, BRAKE_FORCE, TRACK_RADIUS, TRACK_WIDTH } from '../constants';
import { multisynq, PeerData } from '../services/multisynqService';

// --- Car Component ---

const CarModel: React.FC<{ 
  position: [number, number, number], 
  rotation: number, 
  color: string, 
  isLocal: boolean,
  controls?: CarControls,
  playerName?: string
}> = ({ position, rotation, color, isLocal, controls, playerName }) => {
  const meshRef = useRef<THREE.Group>(null);
  const wheelRef1 = useRef<THREE.Mesh>(null);
  const wheelRef2 = useRef<THREE.Mesh>(null);
  const wheelRef3 = useRef<THREE.Mesh>(null);
  const wheelRef4 = useRef<THREE.Mesh>(null);

  // Smooth out remote players movement
  useFrame(() => {
    if (!isLocal && meshRef.current) {
        // Simple lerp for smoothness (if we were receiving stream updates)
        // Since we pass direct props, React handles the updates, 
        // but for high freq we might want direct ref manipulation in parent. 
        // Keeping simple for now.
    }
    
    // Rotate wheels based on assumed movement or local controls
    const isMoving = isLocal ? (controls?.forward || controls?.backward) : true; // Assume peers are moving if they exist for now
    if (isMoving) {
      const speed = 0.2;
      if (wheelRef1.current) wheelRef1.current.rotation.x += speed;
      if (wheelRef2.current) wheelRef2.current.rotation.x += speed;
      if (wheelRef3.current) wheelRef3.current.rotation.x += speed;
      if (wheelRef4.current) wheelRef4.current.rotation.x += speed;
    }
  });

  return (
    <group ref={meshRef} position={position} rotation={[0, rotation, 0]}>
      {/* Player Name Tag */}
      {!isLocal && playerName && (
        <Text
          position={[0, 2.5, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="black"
        >
          {playerName}
        </Text>
      )}

      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.5, 2]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.9, -0.2]}>
        <boxGeometry args={[0.8, 0.4, 1]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Spoiler */}
      <mesh position={[0, 0.8, 0.9]}>
        <boxGeometry args={[1.2, 0.1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Headlights */}
      <mesh position={[0.3, 0.5, -1]}>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshBasicMaterial color={controls?.forward ? "#00ffff" : "#ccffff"} />
      </mesh>
      <mesh position={[-0.3, 0.5, -1]}>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshBasicMaterial color={controls?.forward ? "#00ffff" : "#ccffff"} />
      </mesh>

      {/* Taillights */}
      <mesh position={[0.3, 0.5, 1]}>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshBasicMaterial color={controls?.brake ? "#ff0000" : "#550000"} />
      </mesh>
      <mesh position={[-0.3, 0.5, 1]}>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshBasicMaterial color={controls?.brake ? "#ff0000" : "#550000"} />
      </mesh>

      {/* Wheels */}
      <mesh ref={wheelRef1} position={[0.6, 0.25, -0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={wheelRef2} position={[-0.6, 0.25, -0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={wheelRef3} position={[0.6, 0.25, 0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh ref={wheelRef4} position={[-0.6, 0.25, 0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {isLocal && (
        <group position={[0, 0.5, 0]}>
           <Trail width={0.8} length={6} color={new THREE.Color(0, 1, 1)} attenuation={(t) => t * t} />
        </group>
      )}
    </group>
  );
};

// --- Environment & Track ---

const Track = () => {
  const curve = useMemo(() => {
    const points = [];
    // Generate a figure-8 or complex loop
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * Math.PI * 2;
      const x = Math.sin(t) * TRACK_RADIUS + Math.sin(t * 3) * 20;
      const z = Math.cos(t) * TRACK_RADIUS + Math.cos(t * 2) * 20;
      points.push(new THREE.Vector3(x, 0, z));
    }
    return new THREE.CatmullRomCurve3(points, true);
  }, []);

  const linePoints = useMemo(() => curve.getPoints(500), [curve]);
  
  // Generate tree positions along the track
  const trees = useMemo(() => {
    const items = [];
    for (let i = 0; i < 200; i++) {
      const t = Math.random();
      const pos = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      // Offset from track center
      const offset = (Math.random() > 0.5 ? 1 : -1) * (TRACK_WIDTH/2 + 2 + Math.random() * 15);
      const treePos = pos.add(normal.multiplyScalar(offset));
      const scale = 0.5 + Math.random() * 1.5;
      items.push({ pos: treePos, scale });
    }
    return items;
  }, [curve]);

  return (
    <group>
      {/* The Road Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <tubeGeometry args={[curve, 200, TRACK_WIDTH / 2, 8, true]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* Road Border Lines */}
      <mesh position={[0, 0.03, 0]}>
         <tubeGeometry args={[curve, 200, TRACK_WIDTH / 2 + 0.5, 2, true]} />
         <meshBasicMaterial color="#ef4444" wireframe />
      </mesh>

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={10}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050505"
          metalness={0.5}
        />
      </mesh>

      {/* Trees - Using Instances for performance */}
      <Instances range={trees.length}>
        <coneGeometry args={[1, 3, 4]} />
        <meshStandardMaterial color="#00ffaa" emissive="#004400" />
        {trees.map((data, i) => (
          <Instance
            key={i}
            position={[data.pos.x, 1.5 * data.scale, data.pos.z]}
            scale={[data.scale, data.scale, data.scale]}
          />
        ))}
      </Instances>
      <Instances range={trees.length}>
        <cylinderGeometry args={[0.2, 0.2, 1, 4]} />
        <meshStandardMaterial color="#333" />
        {trees.map((data, i) => (
          <Instance
             key={`trunk-${i}`}
             position={[data.pos.x, 0.5 * data.scale, data.pos.z]}
             scale={[data.scale, data.scale, data.scale]}
          />
        ))}
      </Instances>

    </group>
  );
};

// --- Camera ---

const CameraController: React.FC<{ 
  position: [number, number, number], 
  rotation: number 
}> = ({ position, rotation }) => {
  const { camera } = useThree();
  
  useFrame(() => {
    // Stiffer camera for racing feel
    const dist = 12;
    const height = 6;
    const lookAhead = 10;
    
    const targetX = position[0] - Math.sin(rotation) * dist;
    const targetZ = position[2] - Math.cos(rotation) * dist;
    
    // Smoothly interpolate camera position
    camera.position.lerp(new THREE.Vector3(targetX, position[1] + height, targetZ), 0.1);
    
    // Look slightly ahead of car
    const lookAtX = position[0] + Math.sin(rotation) * lookAhead;
    const lookAtZ = position[2] + Math.cos(rotation) * lookAhead;
    
    camera.lookAt(lookAtX, position[1], lookAtZ);
  });

  return null;
};

// --- Main Game Logic ---

interface GameSceneProps {
  setSpeedDisplay: (speed: number) => void;
  gameStatus: string;
  playerName: string;
  playerColor: string;
}

export const GameScene: React.FC<GameSceneProps> = ({ setSpeedDisplay, gameStatus, playerName, playerColor }) => {
  // Local Player State
  const [position, setPosition] = useState<[number, number, number]>([0, 0.5, 0]);
  const [rotation, setRotation] = useState(0);
  const [velocity, setVelocity] = useState(0);
  
  // Controls
  const controlsRef = useRef<CarControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    boost: false,
  });

  // Remote Peers
  const [peers, setPeers] = useState<PeerData[]>([]);

  // Setup Networking Listeners
  useEffect(() => {
    multisynq.subscribeToPeers((updatedPeers) => {
      setPeers(updatedPeers);
    });
  }, []);

  // Broadcast State Loop
  useEffect(() => {
    if (gameStatus !== 'RACING') return;

    const interval = setInterval(() => {
      multisynq.broadcastState({
        name: playerName,
        color: playerColor,
        position,
        rotation,
        velocity
      });
    }, 50); // 20 updates per second

    return () => clearInterval(interval);
  }, [gameStatus, position, rotation, velocity, playerName, playerColor]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': controlsRef.current.forward = true; break;
        case 's': controlsRef.current.backward = true; break;
        case 'a': controlsRef.current.left = true; break;
        case 'd': controlsRef.current.right = true; break;
        case ' ': controlsRef.current.brake = true; break;
        case 'shift': controlsRef.current.boost = true; break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': controlsRef.current.forward = false; break;
        case 's': controlsRef.current.backward = false; break;
        case 'a': controlsRef.current.left = false; break;
        case 'd': controlsRef.current.right = false; break;
        case ' ': controlsRef.current.brake = false; break;
        case 'shift': controlsRef.current.boost = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Physics Loop
  useFrame(() => {
    if (gameStatus !== 'RACING') return;

    const { forward, backward, left, right, brake, boost } = controlsRef.current;

    // Acceleration
    let targetSpeed = 0;
    if (forward) targetSpeed = MAX_SPEED * (boost ? 1.5 : 1);
    if (backward) targetSpeed = -MAX_SPEED * 0.4;

    // Apply Physics
    let newVelocity = velocity;
    
    if (forward || backward) {
      // Accelerate towards target
      newVelocity += (targetSpeed - velocity) * ACCELERATION;
    } else {
      // Natural rolling friction
      newVelocity *= FRICTION; 
    }
    
    if (brake) {
      newVelocity *= BRAKE_FORCE;
    }

    // Stop completely if very slow
    if (Math.abs(newVelocity) < 0.001) newVelocity = 0;

    setVelocity(newVelocity);

    // Rotation (Steering)
    let newRotation = rotation;
    if (Math.abs(newVelocity) > 0.01) {
      // Reverse steering direction when going backwards for realism
      const dir = newVelocity > 0 ? 1 : -1;
      if (left) newRotation += TURN_SPEED * dir;
      if (right) newRotation -= TURN_SPEED * dir;
    }
    setRotation(newRotation);

    // Position Update
    const newX = position[0] + Math.sin(newRotation) * newVelocity;
    const newZ = position[2] + Math.cos(newRotation) * newVelocity;

    // Simple boundary check (optional, let them drive off road for now)
    
    setPosition([newX, 0, newZ]);
    
    // Update HUD
    setSpeedDisplay(Math.abs(Math.round(newVelocity * 220)));
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 10, 20]} fov={60} />
      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 50, 0]} intensity={2} distance={200} />
      <directionalLight position={[100, 100, 50]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
      
      {/* Background Stars */}
      <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* The World */}
      <Track />

      {/* Player Car */}
      <CarModel 
        position={position} 
        rotation={rotation} 
        color={playerColor} 
        isLocal={true}
        controls={controlsRef.current}
      />
      <CameraController position={position} rotation={rotation} />

      {/* Remote Peers Cars */}
      {peers.map(peer => (
        <CarModel 
          key={peer.id}
          position={peer.position}
          rotation={peer.rotation}
          color={peer.color}
          isLocal={false}
          playerName={peer.name}
        />
      ))}
    </>
  );
};