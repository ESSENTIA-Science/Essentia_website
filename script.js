document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar 요소 선택
    const navbar = document.querySelector('.navbar');
    // 2. 스크롤 임계점 설정 (Hero 섹션의 대략적인 상단 영역)
    const scrollThreshold = 100; // 100px 스크롤 시 Solid로 전환

    // 3. 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', () => {
        // 현재 스크롤 위치가 임계점보다 큰지 확인
        if (window.scrollY > scrollThreshold) {
            // 임계점을 넘었으면 'scrolled' 클래스 추가
            if (!navbar.classList.contains('scrolled')) {
                navbar.classList.add('scrolled');
            }
        } else {
            // 임계점 미만이면 'scrolled' 클래스 제거
            if (navbar.classList.contains('scrolled')) {
                navbar.classList.remove('scrolled');
            }
        }
    });
});