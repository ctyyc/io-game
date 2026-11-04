# MONO SLUG

흑(#000)과 백(#fff) 두 가지 색만 사용하는 웹 런앤건 게임입니다. (메탈슬러그 스타일, 솔로 플레이)

## 조작 (방향키 + 스페이스만 사용)

| 키 | 동작 |
| --- | --- |
| ← → | 이동 / 방향 전환 |
| ↑ | 점프 |
| ↓ | 앉기 (공중에서 누른 채 발사하면 아래로 사격) |
| Space | 발사 / 메뉴 선택 |

- 타이틀: ← → 로 스테이지 ±1, ↑ ↓ 로 ±10 (도달한 스테이지까지 선택 가능)
- 스테이지는 1~255, 매 스테이지 끝에 보스(탱크 / 헬기 / 워커 순환)가 등장합니다.
- `H` 상자를 먹으면 헤비 머신건. 5스테이지 클리어마다 라이프 +1.
- 창이 포커스를 잃으면 자동 일시정지, Space로 재개합니다.

## 로컬 실행

정적 파일뿐이라 `index.html`을 열거나 아무 정적 서버로 실행하면 됩니다.

```
python3 -m http.server 8000
```

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만들고 이 폴더를 push 합니다.
   ```
   git remote add origin https://github.com/<USER>/<REPO>.git
   git push -u origin main
   ```
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 선택합니다.
   (`.github/workflows/pages.yml` 이 push 때마다 자동 배포합니다.)
3. 배포 주소: `https://<USER>.github.io/<REPO>/`
