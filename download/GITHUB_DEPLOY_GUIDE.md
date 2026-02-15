# 주역 점술 앱 - GitHub 업로드 및 배포 가이드

## 📦 프로젝트 구조

```
my-project/
├── src/
│   ├── app/
│   │   └── page.tsx          # 메인 페이지 컴포넌트
│   ├── data/
│   │   ├── gua-data.ts       # 64괘 데이터 (괘사, 효사)
│   │   └── gua-interpretations.ts  # 괘 해석 데이터
│   └── components/ui/        # UI 컴포넌트들
├── public/                   # 정적 파일
├── package.json
└── next.config.ts
```

---

## 🚀 GitHub 업로드 방법

### 1단계: GitHub 저장소 생성

1. https://github.com 접속 후 로그인
2. 우측 상단 **"+"** 버튼 → **"New repository"** 클릭
3. 저장소 정보 입력:
   - **Repository name**: `i-ching-divination` (또는 원하는 이름)
   - **Description**: 주역 점술 웹 애플리케이션
   - **Public** 선택 (무료 배포를 위해)
4. **"Create repository"** 클릭

### 2단계: 로컬에서 Git 초기화 및 업로드

터미널에서 다음 명령어를 실행하세요:

```bash
# 1. 프로젝트 디렉토리로 이동
cd /home/z/my-project

# 2. Git 초기화
git init

# 3. .gitignore 파일 확인 (이미 있어야 함)
# 없다면 생성:
cat > .gitignore << 'EOF'
# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next/
out/

# production
build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOF

# 4. 모든 파일 추가
git add .

# 5. 첫 번째 커밋
git commit -m "Initial commit: 주역 점술 앱"

# 6. GitHub 원격 저장소 연결
git remote add origin https://github.com/사용자명/i-ching-divination.git

# 7. main 브랜치로 푸시
git branch -M main
git push -u origin main
```

---

## 🌐 Vercel로 무료 배포하기 (가장 추천)

### 방법 1: 웹사이트에서 배포 (쉬움)

1. https://vercel.com 접속
2. **"Sign Up"** → **"Continue with GitHub"** 선택
3. GitHub 계정으로 로그인 및 권한 승인
4. 대시보드에서 **"Add New..."** → **"Project"** 클릭
5. GitHub 저장소 목록에서 `i-ching-divination` 선택
6. **"Import"** 클릭
7. 설정은 기본값 유지 (Next.js 자동 감지)
8. **"Deploy"** 클릭
9. 1~2분 후 배포 완료! 🎉

### 방법 2: CLI로 배포

```bash
# 1. Vercel CLI 설치
npm install -g vercel

# 2. 프로젝트 디렉토리에서 로그인
vercel login

# 3. 배포
vercel

# 4. 프로덕션 배포
vercel --prod
```

---

## 🔥 Netlify로 배포하기

1. https://netlify.com 접속
2. **"Sign up"** → **"GitHub"** 선택
3. 로그인 후 **"Add new site"** → **"Import an existing project"**
4. GitHub 저장소 선택
5. 빌드 설정:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. **"Deploy site"** 클릭

---

## 📱 GitHub Pages로 배포하기

Next.js 정적 내보내기:

```bash
# 1. next.config.ts에 추가
# output: 'export'

# 2. 정적 사이트 빌드
npm run build

# 3. out 폴더가 생성됨

# 4. GitHub Settings → Pages → Source를 "GitHub Actions"로 변경
```

---

## ⚙️ 환경 변수 설정 (필요한 경우)

Vercel 대시보드에서:
1. 프로젝트 선택 → **Settings** → **Environment Variables**
2. 필요한 변수 추가

---

## 🔄 업데이트 배포 방법

코드 수정 후:

```bash
# 변경사항 확인
git status

# 변경사항 추가
git add .

# 커밋
git commit -m "기능 업데이트 설명"

# 푸시
git push origin main
```

Vercel/Netlify는 자동으로 재배포됩니다!

---

## 📊 배포 후 확인사항

- [ ] 웹사이트가 정상적으로 로드되는지 확인
- [ ] 동전 던지기 애니메이션이 작동하는지 확인
- [ ] 효과음이 재생되는지 확인 (브라우저에서 허용 필요)
- [ ] 모바일에서도 반응형으로 잘 보이는지 확인
- [ ] HTTPS가 적용되었는지 확인 (자동 적용됨)

---

## 🆘 문제 해결

### 빌드 에러 발생 시
```bash
# 의존성 재설치
rm -rf node_modules
npm install

# 린트 확인
npm run lint
```

### 소리가 안 나올 때
- 브라우저에서 사운드 권한을 허용해야 합니다
- 사용자가 페이지를 클릭한 후에 소리가 재생됩니다 (브라우저 정책)

### 배포 URL
- Vercel: `https://프로젝트명.vercel.app`
- Netlify: `https://프로젝트명.netlify.app`

---

## 🎉 완료!

이제 전 세계 어디서든 주역 점술 앱에 접속할 수 있습니다!

공유할 URL: `https://당신의-프로젝트.vercel.app`
