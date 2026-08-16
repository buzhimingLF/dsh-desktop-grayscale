export declare const name = "dsh-routing-suite";
export declare const inject: string[];
export declare const routingPreset = "routing-suite";
export declare function selectedPreset(session: any): string | undefined;
export interface Config {
    /** Enable task-aware routing guidance. */
    enabled: boolean;
    /** Automatic classification is recommended; fixed strategies are available for predictable behavior. */
    strategy: 'auto' | 'inspect-first' | 'direct';
}
export declare const Config: Config;
export declare function apply(ctx: any, config: Config): void;
