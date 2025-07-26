import React, { useState, useMemo } from 'react';

const HeatmapSimulator = () => {
const [lpac, setLpac] = useState(0.7);
const [upac, setUpac] = useState(25);
const [lpacWeight, setLpacWeight] = useState(1.1);
const [upacWeight, setUpacWeight] = useState(1.1);

// 회귀 모델 계수 (분석에서 도출된 값)
const models = {
    a: [2.965, -2.962, 0.044],
    b: [2.242, -0.586, 0.016],
    c: [-0.091, 2.967, -0.005],
    d: [2.831, -0.199, -0.021],
    e: [4.143, -2.187, -0.030]
};

// 가중치가 적용된 예측 함수
const predict = (lpacVal, upacVal, variable) => {
    const [b0, b1, b2] = models[variable];
    return Math.max(1, Math.min(3, b0 + b1 * lpacVal * lpacWeight + b2 * upacVal * upacWeight));
};

// 현재 예측값들
const predictions = useMemo(() => {
    return {
    a: predict(lpac, upac, 'a'),
    b: predict(lpac, upac, 'b'),
    c: predict(lpac, upac, 'c'),
    d: predict(lpac, upac, 'd'),
    e: predict(lpac, upac, 'e')
    };
}, [lpac, upac, lpacWeight, upacWeight]);

// 고도화된 웨이퍼 형상 계산 함수
const calculateWaferThickness = (r, baseShape, upacVal, lpacVal) => {
    // 기준 UPAC/LPAC 값
    const baseUPAC = 33.0;
    const baseLPAC = 0.85;

    // 기준 형상별 두께 프로파일
    let baseThickness;
    switch (baseShape) {
    case 'convex':
        baseThickness = 774.2 - 0.5 * r * r;
        break;
    case 'flat':
        baseThickness = 774.0;
        break;
    case 'concave':
        baseThickness = 773.8 + 0.5 * r * r;
        break;
    default:
        baseThickness = 774.0;
    }

    // UPAC/LPAC 영향 계산 (감도 조정됨)
    // UPAC: 중심부에 주로 영향 - 증가 시 중심 높아짐 (감도 75% 감소, 원래 대비 25%)
    let deltaUPAC = 0;
    if (baseShape === 'convex') {
    // 볼록: UPAC 증가 → 중심 높아짐 → 볼록성 강화(악화)
    deltaUPAC = (upacVal - baseUPAC) * (1 - r * r) * 0.0375; // 0.075 → 0.0375 (추가 50% 감소, 총 75% 감소)
    } else if (baseShape === 'concave') {
    // 오목: UPAC 증가 → 중심 높아짐 → 오목성 감소(평평해짐)
    deltaUPAC = (upacVal - baseUPAC) * (1 - r * r) * 0.0375; // 0.075 → 0.0375 (추가 50% 감소, 총 75% 감소)
    } else {
    // 평평: UPAC 변화에 따른 중심부 변화
    deltaUPAC = (upacVal - baseUPAC) * (1 - r * r) * 0.025; // 0.05 → 0.025 (추가 50% 감소, 총 75% 감소)
    }

    // LPAC: 가장자리에 주로 영향 - 증가 시 가장자리 두께 증가 (감도 6배 증가)
    let deltaLPAC = 0;
    if (baseShape === 'convex') {
    // 볼록: LPAC 증가 → 가장자리 두께 증가 → 볼록성 감소(평평해짐)
    deltaLPAC = (lpacVal - baseLPAC) * r * r * 1.2; // 0.4 → 1.2 (3배 추가 증가, 총 6배)
    } else if (baseShape === 'concave') {
    // 오목: LPAC 증가 → 가장자리 두께 증가 → 오목성 강화(악화)
    deltaLPAC = (lpacVal - baseLPAC) * r * r * 1.2; // 0.4 → 1.2 (3배 추가 증가, 총 6배)
    } else {
    // 평평: LPAC 변화에 따른 가장자리 변화
    deltaLPAC = (lpacVal - baseLPAC) * r * r * 0.9; // 0.3 → 0.9 (3배 추가 증가, 총 6배)
    }

    // 최종 두께
    return baseThickness + deltaUPAC + deltaLPAC;
};

// 개별 웨이퍼 형상 그래프 컴포넌트 (반응형 디자인, 세로길이 15% 증가)
const WaferShapeGraph = ({ title, baseShape, shapeName }) => {
    const svgHeight = 92; // 80 → 92 (15% 증가)

    // 뷰박스 크기 설정 (고정값 기준)
    const viewBoxWidth = 308;
    const viewBoxHeight = 92; // 80 → 92 (15% 증가)
    const centerX = viewBoxWidth / 2;
    const centerY = viewBoxHeight / 2;
    const viewBoxDisplayRadius = 110;

    // 기준 형상 생성
    const createReferenceShape = () => {
    const points = 50;
    const refPoints = [];
    
    for (let i = 0; i <= points; i++) {
        const ratio = i / points; // 0 to 1
        const x = centerX - viewBoxDisplayRadius + (ratio * viewBoxDisplayRadius * 2);
        const r = Math.abs(ratio - 0.5) * 2; // 중심에서 가장자리까지의 거리 (0~1)
        
        // 기준 형상 두께 계산
        const thickness = calculateWaferThickness(r, baseShape, 33.0, 0.85);
        
        // 시각적 높이 변환 (증폭)
        const height = 15 + (thickness - 774.0) * 50;
        const y = centerY - height;
        refPoints.push(`${x},${y}`);
    }
    
    return `M ${refPoints.join(' L ')}`;
    };

    // 변화된 형상 생성 (UPAC/LPAC 적용)
    const createModifiedShape = () => {
    const points = 50;
    const modPoints = [];
    
    for (let i = 0; i <= points; i++) {
        const ratio = i / points; // 0 to 1
        const x = centerX - viewBoxDisplayRadius + (ratio * viewBoxDisplayRadius * 2);
        const r = Math.abs(ratio - 0.5) * 2; // 중심에서 가장자리까지의 거리 (0~1)
        
        // 변화된 형상 두께 계산 (실제 UPAC/LPAC 적용)
        const thickness = calculateWaferThickness(r, baseShape, upac, lpac);
        
        // 시각적 높이 변환 (증폭)
        const height = 15 + (thickness - 774.0) * 50;
        const y = centerY - height;
        modPoints.push(`${x},${y}`);
    }
    
    return `M ${modPoints.join(' L ')}`;
    };

    return (
    <div className="flex flex-col items-center w-full">
        <div className="bg-white p-1 rounded border w-full">
        <svg 
            width="100%" 
            height={svgHeight} 
            className="w-full h-auto"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
        >
            {/* Title inside graph area */}
            <text 
            x={centerX} 
            y="12" 
            textAnchor="middle" 
            fontSize="10" 
            fontWeight="bold"
            fill="#374151"
            >
            {title}
            </text>
            
            {/* Reference Shape (gray dashed) */}
            <path
            d={createReferenceShape()}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity="0.8"
            />
            
            {/* Modified Shape (orange solid - 2x thicker) */}
            <path
            d={createModifiedShape()}
            fill="none"
            stroke="#f97316"
            strokeWidth="8"
            strokeLinecap="round"
            />
        </svg>
        </div>
    </div>
    );
};

// 웨이퍼 형상 시뮬레이션 컴포넌트 (3개 그래프)
const WaferSimulation = () => {
    // 기준 UPAC/LPAC 값
    const baseUPAC = 33.0;
    const baseLPAC = 0.85;

    return (
    <div className="flex flex-col items-center w-full">
        <div className="bg-gray-50 p-3 rounded-lg border w-full max-w-6xl">
        {/* 3 Graphs with Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 mb-3">
            <WaferShapeGraph 
            title="Convex Reference Shape"
            baseShape="convex"
            shapeName="Convex"
            />
            <WaferShapeGraph 
            title="Flat Reference Shape"
            baseShape="flat"
            shapeName="Flat"
            />
            <WaferShapeGraph 
            title="Concave Reference Shape"
            baseShape="concave"
            shapeName="Concave"
            />
        </div>
        
        {/* Physical Interpretation - Compact */}
        <div className="p-3 bg-gray-100 rounded text-xs">
            <div className="font-semibold text-gray-800 mb-2">Physical Interpretation</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
                <strong>UPAC Effect:</strong> Upper pressure → center thickness
                <br />• Convex: UPAC ↑ → Center ↑ → More convex
                <br />• Concave: UPAC ↑ → Center ↑ → Less concave
            </div>
            <div>
                <strong>LPAC Effect:</strong> Lower pressure → edge thickness  
                <br />• Convex: LPAC ↑ → Edge ↑ → Less convex
                <br />• Concave: LPAC ↑ → Edge ↑ → More concave
            </div>
            </div>
        </div>
        </div>
    </div>
    );
};

// 형상 분석을 위한 데이터 생성 (부드러운 전환)
const generateShapeData = () => {
    const positions = Array.from({length: 30}, (_, i) => i);

    // UPAC 형상: 부드러운 기울기 전환
    const upacShapeData = positions.map(pos => {
    const positionFactor = pos / 29;
    const upacNormalized = upac / 60;
    
    if (upacNormalized >= 0.4 && upacNormalized <= 0.6) {
        return 2;
    }
    
    let intensity;
    if (upacNormalized < 0.4) {
        intensity = (0.4 - upacNormalized) / 0.4;
        return 2 + intensity * (1 - 2 * positionFactor);
    } else {
        intensity = (upacNormalized - 0.6) / 0.4;
        return 2 + intensity * (2 * positionFactor - 1);
    }
    });

    // LPAC 형상: 부드러운 오목/볼록 전환
    const lpacShapeData = positions.map(pos => {
    const positionFactor = pos / 29;
    const lpacNormalized = (lpac - 0.3) / 0.7;
    
    if (lpacNormalized >= 0.4 && lpacNormalized <= 0.6) {
        return 2;
    }
    
    const centerFactor = 4 * (positionFactor - 0.5) * (positionFactor - 0.5);
    let intensity;
    if (lpacNormalized < 0.4) {
        intensity = (0.4 - lpacNormalized) / 0.4;
        return 2 + intensity * centerFactor;
    } else {
        intensity = (lpacNormalized - 0.6) / 0.4;
        return 2 - intensity * centerFactor;
    }
    });

    return { upacShapeData, lpacShapeData };
};

// 50칸 히트맵을 위한 데이터 생성 (유사한 추세로 확장)
const generateExtendedValues = () => {
    const baseValues = [
    { name: 'A', value: predictions.a },
    { name: 'B', value: predictions.b },
    { name: 'C', value: predictions.c },
    { name: 'D', value: predictions.d },
    { name: 'E', value: predictions.e }
    ];

    const extendedValues = [];

    baseValues.forEach((base, index) => {
    for (let i = 0; i < 10; i++) { // 6 → 10 (5×10=50칸)
        const variation = (Math.sin((index * 10 + i) * 0.3) * 0.25); // 6 → 10, 0.4 → 0.3
        const adjustedValue = Math.max(1, Math.min(3, base.value + variation));
        
        extendedValues.push({
        name: `${base.name}${i + 1}`,
        value: adjustedValue,
        group: base.name
        });
    }
    });

    return extendedValues;
};

// 적색-흰색 그라데이션 색상 매핑
const getGradientColor = (value) => {
    const normalized = Math.max(0, Math.min(1, (value - 1) / 2));
    const white = { r: 255, g: 255, b: 255 };
    const crimsonRed = { r: 220, g: 20, b: 60 };

    const r = Math.round(white.r + (crimsonRed.r - white.r) * normalized);
    const g = Math.round(white.g + (crimsonRed.g - white.g) * normalized);
    const b = Math.round(white.b + (crimsonRed.b - white.b) * normalized);

    return `rgb(${r}, ${g}, ${b})`;
};

// 형상 변화 그래프 컴포넌트 (박스 없는 단순 버전)
const ShapeGraphSimple = ({ title, values, type, showLabels = true, titlePosition = 'top' }) => {
    const svgHeight = 140;
    const padding = 40;

    const normalizedValues = values.map(v => {
    const normalized = (v - 0) / (3 - 0);
    return Math.max(0, Math.min(1, normalized));
    });

    const createPath = (width) => {
    const graphWidth = width - padding * 2;
    const graphHeight = svgHeight - padding * 2;
    
    const points = normalizedValues.map((value, index) => {
        const x = padding + (index / (normalizedValues.length - 1)) * graphWidth;
        const y = padding + (1 - value) * graphHeight;
        return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
    };

    return (
    <div className="flex flex-col w-full h-full">
        {/* Title at top (for UPAC) */}
        {titlePosition === 'top' && (
        <h4 className="text-base font-semibold mb-1 text-center">{title}</h4>
        )}
        
        <div className="flex-1">
        <svg 
            width="100%" 
            height="100%" 
            className="w-full h-full"
            viewBox={`0 0 600 ${svgHeight}`}
            preserveAspectRatio="none"
        >
            {/* Vertical grid lines - 3 evenly spaced */}
            {[0.25, 0.5, 0.75].map((ratio, index) => {
            const x = padding + ratio * (600 - padding * 2);
            return (
                <line 
                key={`v-${index}`}
                x1={x} 
                y1={padding} 
                x2={x} 
                y2={svgHeight - padding} 
                stroke="#d1d5db" 
                strokeWidth="1"
                />
            );
            })}
            
            {/* Horizontal grid lines - 3 evenly spaced */}
            {[0.25, 0.5, 0.75].map((ratio, index) => {
            const y = padding + ratio * (svgHeight - padding * 2);
            return (
                <line 
                key={`h-${index}`}
                x1={padding} 
                y1={y} 
                x2={600 - padding} 
                y2={y} 
                stroke="#d1d5db" 
                strokeWidth="1"
                />
            );
            })}
            
            {/* Graph line only - no axes */}
            <path
            d={createPath(600)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            />
            
            {/* OUTER/INNER labels - conditional */}
            {showLabels && (
            <>
                <text 
                x={padding} 
                y={svgHeight - 10} 
                textAnchor="start" 
                fontSize="12" 
                fontWeight="bold"
                fill="#6b7280"
                >
                OUTER
                </text>
                <text 
                x={600 - padding} 
                y={svgHeight - 10} 
                textAnchor="end" 
                fontSize="12" 
                fontWeight="bold"
                fill="#6b7280"
                >
                INNER
                </text>
            </>
            )}
        </svg>
        </div>
        
        {/* Title at bottom (for LPAC) */}
        {titlePosition === 'bottom' && (
        <h4 className="text-base font-semibold mt-1 text-center">{title}</h4>
        )}
    </div>
    );
};

// 모바일 대응 히트맵 컴포넌트 (50칸, 외곽선 제거, 라벨 제거)
const ExtendedHeatmap = () => {
    const values = generateExtendedValues();

    return (
    <div className="flex flex-col items-center w-full px-2">
        <div className="w-full max-w-full overflow-hidden">
        <div className="flex w-full" style={{ minWidth: 'fit-content' }}>
            {values.map((item, index) => (
            <div 
                key={item.name}
                className="flex-1 relative transition-all duration-300"
                style={{
                minWidth: 'calc(100vw / 50 - 1px)', // 30 → 50
                maxWidth: '24px', // 40px → 24px (50칸에 맞춰 축소)
                height: '56px', // 80px → 56px (30% 축소)
                backgroundColor: getGradientColor(item.value)
                // borderRight와 boxShadow 제거로 외곽선 완전 제거
                }}
            />
            ))}
        </div>
        </div>
    </div>
    );
};

const extendedValues = useMemo(() => generateExtendedValues(), [lpac, upac, lpacWeight, upacWeight]);
const shapeData = useMemo(() => generateShapeData(), [lpac, upac]);

return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
    <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-800">
        DSP UPAC/LPAC simulator
        </h1>

        {/* Vertical Parameters + Upper/Lower Plate Shapes + Heatmap Combined */}
        <div className="bg-white p-4 rounded-lg shadow-lg mb-2">
        <div className="grid grid-cols-3 gap-4 h-96">
            {/* Vertical Parameters - Left Side (1/3 width) */}
            <div className="col-span-1 flex justify-center items-center space-x-6">
            {/* UPAC Parameter */}
            <div className="flex flex-col items-center h-full">
                <label className="text-sm font-medium text-gray-700 mb-4">
                UPAC: {upac.toFixed(0)}
                </label>
                <div className="flex-1 flex items-center">
                <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={upac}
                    onChange={(e) => setUpac(parseFloat(e.target.value))}
                    className="h-80 w-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                    writingMode: 'bt-lr',
                    WebkitAppearance: 'slider-vertical'
                    }}
                />
                </div>
                <div className="flex flex-col text-xs text-gray-500 mt-2 space-y-1">
                <span>60</span>
                <span>0</span>
                </div>
            </div>
            
            {/* LPAC Parameter */}
            <div className="flex flex-col items-center h-full">
                <label className="text-sm font-medium text-gray-700 mb-4">
                LPAC: {lpac.toFixed(2)}
                </label>
                <div className="flex-1 flex items-center">
                <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.01"
                    value={lpac}
                    onChange={(e) => setLpac(parseFloat(e.target.value))}
                    className="h-80 w-4 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                    writingMode: 'bt-lr',
                    WebkitAppearance: 'slider-vertical'
                    }}
                />
                </div>
                <div className="flex flex-col text-xs text-gray-500 mt-2 space-y-1">
                <span>1.0</span>
                <span>0.3</span>
                </div>
            </div>
            </div>
            
            {/* Right Side - 3 Graphs in one container (2/3 width) */}
            <div className="col-span-2 flex flex-col py-1">
            {/* Upper plate shape (UPAC) - Top */}
            <div className="flex-1">
                <ShapeGraphSimple 
                title="Upper plate shape (UPAC)" 
                values={shapeData.upacShapeData} 
                type="upac"
                showLabels={false}
                titlePosition="top"
                />
            </div>
            
            {/* Heatmap - Middle */}
            <div className="h-14 flex items-center justify-center px-4">
                <ExtendedHeatmap />
            </div>
            
            {/* Lower plate shape (LPAC) - Bottom */}
            <div className="flex-1">
                <ShapeGraphSimple 
                title="Lower plate shape (LPAC)" 
                values={shapeData.lpacShapeData} 
                type="lpac"
                showLabels={true}
                titlePosition="bottom"
                />
            </div>
            </div>
        </div>
        </div>

        {/* Wafer Shape Simulation */}
        <div className="bg-white p-4 rounded-lg shadow-lg mb-6 sm:mb-8">
        <WaferSimulation />
        </div>

        {/* Weight Control - Simplified */}
        <div className="bg-white p-4 rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                LPAC Weight: {lpacWeight.toFixed(1)}x
            </label>
            <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={lpacWeight}
                onChange={(e) => setLpacWeight(parseFloat(e.target.value))}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                UPAC Weight: {upacWeight.toFixed(1)}x
            </label>
            <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={upacWeight}
                onChange={(e) => setUpacWeight(parseFloat(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
            />
            </div>
        </div>
        </div>
    </div>
    </div>
);
};

export default HeatmapSimulator;