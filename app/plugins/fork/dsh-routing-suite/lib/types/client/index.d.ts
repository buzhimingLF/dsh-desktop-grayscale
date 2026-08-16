/** Read-only localized Routing Suite status page. */
import { type ReactElement } from 'react';
type SlotsService = {
    inject(name: string, factory: () => unknown): unknown;
    register(options: any, occupant: (props: any) => unknown): unknown;
};
type ClientContext = {
    slots: SlotsService;
    effect(effect: () => unknown, label?: string): void;
};
export declare const inject: string[];
export declare function RoutingSuiteSection(): ReactElement;
export declare function apply(ctx: ClientContext): void;
export {};
