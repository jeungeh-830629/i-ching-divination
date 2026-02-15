'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  guaData,
  getGuaByYaos,
  isYang,
  isChanging,
  getChangedYaos,
  type YaoType,
  type GuaInfo,
} from '@/data/gua-data'
import {
  guaInterpretations,
  getInterpretationById,
  type GuaInterpretation,
} from '@/data/gua-interpretations'

// 사운드 타입
type SoundType = 'coin' | 'bamboo'

// 동전 타입
type CoinSide = 'heads' | 'tails'

// 효 정보 인터페이스
interface YaoInfo {
  value: YaoType;
  coins: CoinSide[];
  line: string;
  isChanging: boolean;
}

// Web Audio API로 동전 소리 생성
function createCoinSound(audioContext: AudioContext) {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.setValueAtTime(1200, audioContext.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08)
  oscillator.type = 'triangle'
  
  gainNode.gain.setValueAtTime(0.25, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.15)
}

// 동전 던지기 소리 (여러 개)
function createCoinTossSound(audioContext: AudioContext) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      createCoinSound(audioContext)
    }, i * 80 + Math.random() * 30)
  }
}

// 죽간 흔드는 소리 (전통적인 느낌)
function createBambooSound(audioContext: AudioContext) {
  // 죽간이 부딪히는 소리
  const createClack = (delay: number, pitch: number) => {
    setTimeout(() => {
      // 노이즈 생성
      const bufferSize = audioContext.sampleRate * 0.1
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1))
      }
      
      const noise = audioContext.createBufferSource()
      noise.buffer = buffer
      
      // 필터로 나무 소리 같은 느낌
      const filter = audioContext.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = pitch
      filter.Q.value = 5
      
      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
      
      noise.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      noise.start()
      noise.stop(audioContext.currentTime + 0.15)
    }, delay)
  }
  
  // 여러 번의 부딪힘 소리
  createClack(0, 800)
  createClack(50, 1200)
  createClack(120, 900)
  createClack(200, 1100)
}

// 결과 완료 소리 (고전적인 종소리)
function createResultSound(audioContext: AudioContext) {
  const frequencies = [392, 523.25, 659.25] // G4, C5, E5
  
  frequencies.forEach((freq, i) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.2)
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + i * 0.2)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.2 + 0.8)
    
    oscillator.start(audioContext.currentTime + i * 0.2)
    oscillator.stop(audioContext.currentTime + i * 0.2 + 0.8)
  })
}

// 동전 3개를 던져서 효 값 계산
function throwCoins(): { coins: CoinSide[], value: YaoType } {
  const coins: CoinSide[] = []
  let heads = 0
  
  for (let i = 0; i < 3; i++) {
    const isHeads = Math.random() < 0.5
    coins.push(isHeads ? 'heads' : 'tails')
    if (isHeads) heads++
  }
  
  // 앞면(양) 개수에 따른 효 값
  let value: YaoType
  switch (heads) {
    case 3: value = 9; break  // 노양 (Old Yang) - 변함
    case 2: value = 7; break  // 소양 (Young Yang) - 안변함
    case 1: value = 8; break  // 소음 (Young Yin) - 안변함
    case 0: value = 6; break  // 노음 (Old Yin) - 변함
    default: value = 7
  }
  
  return { coins, value }
}

// 효 값을 괘 선 문자로 변환
function getYaoLine(value: YaoType): string {
  if (isYang(value)) {
    return '⚊' // 양효
  } else {
    return '⚋' // 음효
  }
}

// 변효 문자 반환
function getChangingYaoLine(value: YaoType): string {
  if (value === 9) return '○' // 노양 - 변화하는 양
  if (value === 6) return '×' // 노음 - 변화하는 음
  return ''
}

export default function Home() {
  const [isStarted, setIsStarted] = useState(false)
  const [isThrowing, setIsThrowing] = useState(false)
  const [currentThrow, setCurrentThrow] = useState(0)
  const [yaos, setYaos] = useState<YaoInfo[]>([])
  const [displayedCoins, setDisplayedCoins] = useState<CoinSide[]>(['heads', 'heads', 'heads'])
  const [showResult, setShowResult] = useState(false)
  const [bengua, setBengua] = useState<GuaInfo | null>(null)
  const [biangua, setBiangua] = useState<GuaInfo | null>(null)
  const [changingYaoIndices, setChangingYaoIndices] = useState<number[]>([])
  const [soundType, setSoundType] = useState<SoundType>('coin')
  const [benguaInterp, setBenguaInterp] = useState<GuaInterpretation | null>(null)
  const [bianguaInterp, setBianguaInterp] = useState<GuaInterpretation | null>(null)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // AudioContext 초기화
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])
  
  // 점 시작
  const startDivination = useCallback(() => {
    setIsStarted(true)
    setYaos([])
    setCurrentThrow(0)
    setShowResult(false)
    setBengua(null)
    setBiangua(null)
    setChangingYaoIndices([])
    setBenguaInterp(null)
    setBianguaInterp(null)
    
    setTimeout(() => throwYao(0, []), 500)
  }, [])
  
  // 효 던지기
  const throwYao = useCallback((throwNumber: number, currentYaos: YaoInfo[]) => {
    if (throwNumber >= 6) {
      // 모든 효 완료 - 결과 계산
      calculateResult(currentYaos)
      return
    }
    
    setIsThrowing(true)
    
    // 동전 던지기 또는 죽간 소리
    const audioContext = getAudioContext()
    if (soundType === 'coin') {
      createCoinTossSound(audioContext)
    } else {
      createBambooSound(audioContext)
    }
    
    // 동전 애니메이션
    let animationCount = 0
    const animationInterval = setInterval(() => {
      setDisplayedCoins([
        Math.random() < 0.5 ? 'heads' : 'tails',
        Math.random() < 0.5 ? 'heads' : 'tails',
        Math.random() < 0.5 ? 'heads' : 'tails',
      ])
      animationCount++
      
      if (animationCount >= 12) {
        clearInterval(animationInterval)
        
        // 최종 결과
        const { coins, value } = throwCoins()
        setDisplayedCoins(coins)
        
        const newYao: YaoInfo = {
          value,
          coins,
          line: getYaoLine(value),
          isChanging: isChanging(value),
        }
        
        const updatedYaos = [...currentYaos, newYao]
        setYaos(updatedYaos)
        setIsThrowing(false)
        setCurrentThrow(throwNumber + 1)
        
        // 다음 효 던지기 (딜레이)
        setTimeout(() => throwYao(throwNumber + 1, updatedYaos), 900)
      }
    }, 70)
  }, [getAudioContext, soundType])
  
  // 결과 계산
  const calculateResult = useCallback((finalYaos: YaoInfo[]) => {
    // 효를 아래에서 위로 정렬 (초효부터 상효까지)
    const yaoValues = finalYaos.map(y => y.value)
    
    // 본괘 계산 (음=0, 양=1)
    const benguaYaos = yaoValues.map(v => isYang(v) ? 1 : 0)
    const benguaInfo = getGuaByYaos(benguaYaos)
    
    // 변괘 계산
    const bianguaYaos = getChangedYaos(yaoValues as YaoType[])
    const bianguaInfo = getGuaByYaos(bianguaYaos)
    
    // 변하는 효 인덱스 (0=초효, 5=상효)
    const changingIndices = yaoValues
      .map((v, i) => isChanging(v as YaoType) ? i : -1)
      .filter(i => i !== -1)
    
    setBengua(benguaInfo || null)
    setBiangua(bianguaInfo || null)
    setChangingYaoIndices(changingIndices)
    
    // 해석 데이터 가져오기
    if (benguaInfo) {
      setBenguaInterp(getInterpretationById(benguaInfo.id) || null)
    }
    if (bianguaInfo && bianguaInfo.id !== benguaInfo?.id) {
      setBianguaInterp(getInterpretationById(bianguaInfo.id) || null)
    }
    
    setShowResult(true)
    
    // 결과 사운드
    const audioContext = getAudioContext()
    createResultSound(audioContext)
  }, [getAudioContext])
  
  // 다시 시작
  const resetDivination = useCallback(() => {
    setIsStarted(false)
    setIsThrowing(false)
    setCurrentThrow(0)
    setYaos([])
    setShowResult(false)
    setBengua(null)
    setBiangua(null)
    setChangingYaoIndices([])
    setBenguaInterp(null)
    setBianguaInterp(null)
  }, [])
  
  // 동전 표시 컴포넌트
  const Coin = ({ side, isAnimating }: { side: CoinSide, isAnimating: boolean }) => (
    <div 
      className={`
        w-14 h-14 md:w-16 md:h-16 rounded-full 
        flex items-center justify-center 
        text-xl md:text-2xl font-bold
        transition-all duration-150
        ${isAnimating ? 'animate-bounce' : ''}
        ${side === 'heads' 
          ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-900 shadow-lg shadow-amber-500/40' 
          : 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-700 shadow-lg shadow-slate-400/40'
        }
        border-4 ${side === 'heads' ? 'border-amber-600' : 'border-slate-600'}
      `}
    >
      {side === 'heads' ? '陽' : '陰'}
    </div>
  )
  
  // 괘 표시 컴포넌트
  const GuaDisplay = ({ gua, title, changingIndices = [], showHighlight = false }: { 
    gua: GuaInfo, 
    title: string,
    changingIndices?: number[],
    showHighlight?: boolean
  }) => (
    <Card className="flex-1 min-w-0 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-xl md:text-2xl text-amber-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 괘 이름과 기호 */}
        <div className="text-center space-y-2">
          <div className="text-3xl md:text-4xl font-bold text-amber-900">
            {gua.upperSymbol}{gua.lowerSymbol}
          </div>
          <div className="text-xl md:text-2xl font-bold text-amber-800">
            {gua.name} ({gua.fullName})
          </div>
          <div className="text-sm text-amber-600">
            상괘: {gua.upperGua} | 하괘: {gua.lowerGua}
          </div>
        </div>
        
        <Separator className="bg-amber-200" />
        
        {/* 괘사 */}
        <div className="space-y-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            괘사(卦辭)
          </Badge>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">
            {gua.guaci}
          </p>
        </div>
        
        <Separator className="bg-amber-200" />
        
        {/* 효사 */}
        <div className="space-y-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            효사(爻辭)
          </Badge>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
            {gua.yaoci.map((yao, index) => (
              <div 
                key={index}
                className={`
                  text-sm p-2 rounded-lg transition-all
                  ${showHighlight && changingIndices.includes(index) 
                    ? 'bg-red-100 border border-red-300 text-red-800 font-medium' 
                    : 'bg-amber-50 text-gray-700'
                  }
                `}
              >
                <span className="font-medium text-amber-700">
                  {['초효', '이효', '삼효', '사효', '오효', '상효'][index]}:
                </span>{' '}
                {yao}
                {showHighlight && changingIndices.includes(index) && (
                  <span className="ml-2 text-red-600 font-bold">← 변효</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // 해석 가이드 컴포넌트
  const InterpretationGuide = ({ changingCount }: { changingCount: number }) => {
    let guide = ''
    
    if (changingCount === 0) {
      guide = '변하는 효가 없으므로 본괘의 괘사를 중심으로 해석합니다. 현재의 상황이 지속될 것입니다.'
    } else if (changingCount === 1) {
      guide = '변하는 효가 하나이므로, 해당 효의 효사를 중심으로 해석합니다. 변괘의 의미도 참고하십시오.'
    } else if (changingCount === 2) {
      guide = '변하는 효가 두 개이므로, 두 효사를 종합하여 해석하되 위쪽 효를 더 중요하게 봅니다.'
    } else if (changingCount === 3) {
      guide = '변하는 효가 세 개이므로, 본괘와 변괘의 괘사를 함께 참고하여 해석합니다.'
    } else if (changingCount === 4) {
      guide = '변하는 효가 네 개이므로, 변하지 않는 두 효 중 아래쪽 효의 효사를 중심으로 해석합니다.'
    } else if (changingCount === 5) {
      guide = '변하는 효가 다섯 개이므로, 변하지 않는 하나의 효사를 중심으로 해석합니다.'
    } else {
      guide = '모든 효가 변하므로, 변괘의 괘사를 중심으로 해석합니다. 큰 변화가 예상됩니다.'
    }
    
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-lg">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📜</div>
            <div className="space-y-2">
              <div className="font-bold text-indigo-800">해석 가이드</div>
              <p className="text-sm text-indigo-700 leading-relaxed">{guide}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 일반적 해석 컴포넌트
  const InterpretationCard = ({ interp, title }: { interp: GuaInterpretation, title: string }) => (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-emerald-800 flex items-center gap-2">
          💡 {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="font-medium text-emerald-700">일반적 의미</div>
          <p className="text-sm text-gray-700">{interp.general}</p>
        </div>
        <Separator className="bg-emerald-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white/50 p-3 rounded-lg">
            <div className="font-medium text-emerald-700 mb-1">💼 사업/진로</div>
            <p className="text-gray-600">{interp.career}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg">
            <div className="font-medium text-emerald-700 mb-1">❤️ 관계/연애</div>
            <p className="text-gray-600">{interp.relationship}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg">
            <div className="font-medium text-emerald-700 mb-1">🏥 건강</div>
            <p className="text-gray-600">{interp.health}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-lg">
            <div className="font-medium text-emerald-700 mb-1">✨ 조언</div>
            <p className="text-gray-600">{interp.advice}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-amber-50 to-stone-100 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 타이틀 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 tracking-wide">
            주역 점술
          </h1>
          <p className="text-amber-700 text-lg">
            周易 - 동전 점으로 미래를 살피다
          </p>
        </div>
        
        {!isStarted ? (
          // 시작 전 화면
          <Card className="bg-gradient-to-br from-stone-50 to-amber-50 border-amber-200 shadow-xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="text-6xl md:text-8xl text-amber-700 animate-pulse">
                  ☰ ☷
                </div>
                
                {/* 사운드 선택 */}
                <div className="space-y-2">
                  <div className="text-sm text-amber-600 font-medium">효과음 선택</div>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant={soundType === 'coin' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSoundType('coin')}
                      className={soundType === 'coin' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-300 text-amber-700'}
                    >
                      🪙 동전 소리
                    </Button>
                    <Button
                      variant={soundType === 'bamboo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSoundType('bamboo')}
                      className={soundType === 'bamboo' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-300 text-amber-700'}
                    >
                      🎋 죽간 소리
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3 text-amber-800">
                  <p className="text-lg font-medium">
                    동전 3개를 6번 던져 64괘 중 하나를 얻습니다.
                  </p>
                  <div className="bg-amber-100/50 rounded-lg p-4 text-sm space-y-2 text-amber-700">
                    <p><span className="font-bold text-amber-800">앞면 3개</span> = 노양(9) → 양이 변하여 음으로</p>
                    <p><span className="font-bold text-amber-800">앞면 2개</span> = 소양(7) → 변하지 않는 양</p>
                    <p><span className="font-bold text-amber-800">앞면 1개</span> = 소음(8) → 변하지 않는 음</p>
                    <p><span className="font-bold text-amber-800">뒷면 3개</span> = 노음(6) → 음이 변하여 양으로</p>
                  </div>
                  <p className="text-sm text-amber-600">
                    노양(○)과 노음(×)은 변하는 효로, 변괘를 형성합니다.
                  </p>
                </div>
                <Button 
                  onClick={startDivination}
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xl px-8 py-6 shadow-lg shadow-amber-500/30 transition-transform hover:scale-105"
                >
                  점 시작하기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 점 진행 중 & 결과 화면
          <div className="space-y-6">
            {/* 동전 영역 */}
            <Card className="bg-gradient-to-br from-stone-50 to-amber-50 border-amber-200 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-lg text-amber-800 font-medium">
                    {showResult ? '✨ 점 완료' : `${currentThrow}번째 효 던지기 중...`}
                  </div>
                  
                  {/* 동전 3개 */}
                  <div className="flex gap-4">
                    {displayedCoins.map((coin, index) => (
                      <Coin 
                        key={index} 
                        side={coin} 
                        isAnimating={isThrowing} 
                      />
                    ))}
                  </div>
                  
                  {/* 현재 효 정보 */}
                  {!showResult && currentThrow > 0 && (
                    <div className="text-center text-amber-700">
                      <span className="text-lg">현재 효: </span>
                      <span className="text-3xl font-bold">
                        {yaos[yaos.length - 1]?.line}
                      </span>
                      {yaos[yaos.length - 1]?.isChanging && (
                        <span className="ml-2 text-red-600 text-xl">
                          {getChangingYaoLine(yaos[yaos.length - 1]?.value)}
                        </span>
                      )}
                      <span className="ml-2 text-sm">
                        ({yaos[yaos.length - 1]?.value === 9 ? '노양' : 
                          yaos[yaos.length - 1]?.value === 6 ? '노음' :
                          yaos[yaos.length - 1]?.value === 7 ? '소양' : '소음'})
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* 괘 표시 영역 */}
            <Card className="bg-gradient-to-br from-stone-50 to-amber-50 border-amber-200 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-lg text-amber-800 font-medium">
                    {showResult ? '본괘(本卦)' : `효 진행상황 (${currentThrow}/6)`}
                  </div>
                  
                  {/* 괘 그림 - 아래에서 위로 (초효가 아래) */}
                  <div className="flex flex-col-reverse items-center space-y-reverse space-y-1 py-4">
                    {yaos.map((yao, index) => (
                      <div 
                        key={index} 
                        className={`
                          text-4xl md:text-5xl font-bold transition-all duration-500
                          ${yao.isChanging ? 'text-red-600 scale-110' : 'text-amber-900'}
                        `}
                      >
                        {yao.line}
                        {yao.isChanging && (
                          <span className="text-xl ml-1 text-red-600">
                            {getChangingYaoLine(yao.value)}
                          </span>
                        )}
                      </div>
                    ))}
                    {/* 빈 효 자리 */}
                    {Array.from({ length: 6 - yaos.length }).map((_, index) => (
                      <div 
                        key={`empty-${index}`}
                        className="text-4xl md:text-5xl text-gray-300 animate-pulse"
                      >
                        ⚋
                      </div>
                    ))}
                  </div>
                  
                  {showResult && bengua && (
                    <div className="text-center mt-2">
                      <span className="text-xl font-bold text-amber-800">
                        {bengua.name} ({bengua.fullName})
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* 결과 표시 */}
            {showResult && bengua && (
              <div className="space-y-6">
                {/* 변괘 표시 */}
                {biangua && biangua.id !== bengua.id && (
                  <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-lg">
                    <CardContent className="pt-6 pb-4">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="text-lg text-red-800 font-medium">
                          변괘(變卦)
                        </div>
                        <div className="text-3xl font-bold text-red-900">
                          {biangua.upperSymbol}{biangua.lowerSymbol}
                        </div>
                        <div className="text-xl font-bold text-red-800">
                          {biangua.name} ({biangua.fullName})
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* 해석 가이드 */}
                <InterpretationGuide changingCount={changingYaoIndices.length} />
                
                {/* 본괘 해석 */}
                {benguaInterp && (
                  <InterpretationCard interp={benguaInterp} title={`${bengua.name}괘 해석`} />
                )}
                
                {/* 변괘 해석 */}
                {bianguaInterp && biangua && biangua.id !== bengua.id && (
                  <InterpretationCard interp={bianguaInterp} title={`${biangua.name}괘 해석 (변괘)`} />
                )}
                
                {/* 상세 결과 */}
                <div className="grid md:grid-cols-2 gap-4">
                  <GuaDisplay 
                    gua={bengua} 
                    title="본괘(本卦)"
                    changingIndices={changingYaoIndices}
                    showHighlight={true}
                  />
                  {biangua && biangua.id !== bengua.id && (
                    <GuaDisplay 
                      gua={biangua} 
                      title="변괘(變卦)"
                      changingIndices={changingYaoIndices}
                      showHighlight={true}
                    />
                  )}
                </div>
                
                {/* 변효 안내 */}
                {changingYaoIndices.length > 0 && (
                  <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-lg">
                    <CardContent className="pt-4 pb-4">
                      <div className="text-center space-y-2">
                        <div className="text-lg font-bold text-red-800">
                          변하는 효가 {changingYaoIndices.length}개 있습니다
                        </div>
                        <div className="text-sm text-red-700">
                          {changingYaoIndices.map(i => 
                            ['초효', '이효', '삼효', '사효', '오효', '상효'][i]
                          ).join(', ')}의 효사를 특히 주의 깊게 살피십시오.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* 다시 시작 버튼 */}
                <div className="text-center">
                  <Button 
                    onClick={resetDivination}
                    size="lg"
                    className="bg-gradient-to-r from-stone-600 to-amber-700 hover:from-stone-700 hover:to-amber-800 text-white shadow-lg transition-transform hover:scale-105"
                  >
                    다시 점 보기
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 푸터 */}
        <div className="text-center text-sm text-amber-600 pt-4 border-t border-amber-200">
          <p>주역 64괘 - 천지자연의 이치를 깨닫다</p>
        </div>
      </div>
    </div>
  )
}
