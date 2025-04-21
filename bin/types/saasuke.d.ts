declare module "saasuke" {
    export interface ERC20 {
        getX(): number;
        moveX(): number;
        moveY(): number;
        moveBoth(x: number, y: number): number;
    }
}