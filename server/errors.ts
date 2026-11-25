import type { ErrorRequestHandler, Request, Response } from 'express';
import { z } from 'zod';
import {
  ContentLimitError,
  ContentNotFoundError,
  ContentRevisionConflictError,
} from './db/content-repository';

export type FieldProblem = { field: string; message: string };

export class ApiProblemError extends Error {
  constructor(
    readonly status: number,
    readonly slug: string,
    readonly title: string,
    readonly detail: string,
    readonly errors?: FieldProblem[],
  ) {
    super(detail);
    this.name = 'ApiProblemError';
  }
}

const parserErrorSchema = z.object({
  type: z.string().optional(),
  status: z.number().int().optional(),
}).passthrough();

function problemBody(problem: ApiProblemError, instance: string): Record<string, unknown> {
  return {
    type: `urn:act:problem:${problem.slug}`,
    title: problem.title,
    status: problem.status,
    detail: problem.detail,
    instance,
    ...(problem.errors === undefined ? {} : { errors: problem.errors }),
  };
}

export function sendProblemResponse(response: Response, request: Request, problem: ApiProblemError): void {
  response
    .status(problem.status)
    .type('application/problem+json')
    .json(problemBody(problem, request.path));
}

function validationProblem(error: z.ZodError): ApiProblemError {
  const errors = error.issues.map((issue) => ({
    field: issue.path.map(String).join('.') || 'body',
    message: 'The value is invalid.',
  }));
  return new ApiProblemError(422, 'validation-error', 'Validation failed', 'The request content is invalid.', errors);
}

function problemFromUnknown(error: unknown): ApiProblemError {
  if (error instanceof ApiProblemError) return error;
  if (error instanceof z.ZodError) return validationProblem(error);
  if (error instanceof ContentRevisionConflictError) {
    return new ApiProblemError(412, 'precondition-failed', 'Content has changed', 'Reload the latest content before saving again.');
  }
  if (error instanceof ContentNotFoundError) {
    return new ApiProblemError(404, 'not-found', 'Resource not found', 'The requested content resource was not found.');
  }
  if (error instanceof ContentLimitError) {
    return new ApiProblemError(409, 'content-limit-reached', 'Content limit reached', 'The maximum number of records has been reached.');
  }

  const parserError = parserErrorSchema.safeParse(error);
  if (parserError.success) {
    if (parserError.data.type === 'entity.too.large' || parserError.data.status === 413) {
      return new ApiProblemError(413, 'payload-too-large', 'Payload too large', 'The request body exceeds the 512 KiB limit.');
    }
    if (parserError.data.type === 'entity.parse.failed' || error instanceof SyntaxError) {
      return new ApiProblemError(400, 'malformed-json', 'Malformed JSON', 'The request body must contain valid JSON.');
    }
    if (parserError.data.status === 415) {
      return new ApiProblemError(415, 'unsupported-media-type', 'Unsupported media type', 'Send the request body as JSON.');
    }
  }
  if (error instanceof SyntaxError) {
    return new ApiProblemError(400, 'malformed-json', 'Malformed JSON', 'The request body must contain valid JSON.');
  }
  return new ApiProblemError(500, 'internal-error', 'Internal server error', 'The request could not be completed.');
}

export const problemErrorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  sendProblemResponse(response, request, problemFromUnknown(error));
};
