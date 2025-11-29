export class HealthPickup {
    constructor(scene, x, y) {
        this.scene = scene;

        // Create visual using health kit sprite
        this.sprite = scene.add.image(x, y, 'health-kit');
        this.sprite.setScale(0.8);
        scene.physics.add.existing(this.sprite);
        this.sprite.body.setCollideWorldBounds(true);

        // Healing amount
        this.healAmount = 25;
        this.alive = true;

        // Floating and pulse animation
        scene.tweens.add({
            targets: this.sprite,
            y: y - 10,
            scale: { from: 0.8, to: 1.0 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        console.log('Health pickup created at', x, y);
    }

    getSprite() {
        return this.sprite;
    }

    getHealAmount() {
        return this.healAmount;
    }

    isAlive() {
        return this.alive;
    }

    collect() {
        this.alive = false;
        this.sprite.destroy();
        console.log('Health pickup collected');
    }
}
