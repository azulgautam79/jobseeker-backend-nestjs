import { Attributes } from '@opentelemetry/api';
import { TraceService } from './trace.service';

interface Traceable {
    traceService: TraceService;
}

export function Trace(
    name: string,
    attributes: Attributes = {},
): MethodDecorator {
    return (
        target: object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor,
    ) => {
        const originalMethod = descriptor.value;

        // Combine custom attributes with auto-discovered metadata
        const metadata: Attributes = {
            ...attributes,
            'code.namespace': target.constructor.name,
            'code.function': String(propertyKey),
        };

        const wrappedMethod = async function (this: Traceable, ...args: unknown[]) {
            const traceService = this.traceService;

            if (!traceService) {
                throw new Error('TraceService is required when using @Trace().');
            }

            return this.traceService.withSpan(
                name, 
                metadata, 
                () => originalMethod.apply(this, args)
            );
        };

        descriptor.value = wrappedMethod;

        return descriptor;
    };
}