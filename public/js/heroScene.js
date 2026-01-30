class HeroScene {
    constructor() {
        this.canvas = document.getElementById('hero-canvas');
        if (!this.canvas) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });

        this.particles = null;
        this.grid = null;
        this.mouseX = 0;
        this.mouseY = 0;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.createParticles();
        this.createGrid();

        this.camera.position.z = 5;

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.animate();
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const count = 1000;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 15;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.015,
            color: 0x2EF2C8,
            transparent: true,
            opacity: 0.4,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createGrid() {
        const size = 60;
        const divisions = 60;
        this.grid = new THREE.GridHelper(size, divisions, 0x1FD1A1, 0x0E3A34);
        this.grid.position.y = -3;
        this.grid.rotation.x = 0.1;
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.05;
        this.scene.add(this.grid);
    }

    onMouseMove(e) {
        this.mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
        this.mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.particles) {
            this.particles.rotation.y += 0.0005;
            this.particles.rotation.x += 0.0002;
            
            this.particles.position.x += (this.mouseX - this.particles.position.x) * 0.05;
            this.particles.position.y += (-this.mouseY - this.particles.position.y) * 0.05;
        }

        if (this.grid) {
            this.grid.position.z = (Date.now() * 0.0002) % 1;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HeroScene();
});
