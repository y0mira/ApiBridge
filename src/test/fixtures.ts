export const FEATURE_SPEC = `openapi: 3.1.0
info: { title: Generator fixture, version: 1.0.0 }
paths:
  /nodes/{id}:
    get:
      operationId: getNode
      summary: Get a node
      tags: [Nodes]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
        - { name: verbose, in: query, schema: { type: boolean, nullable: true } }
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Node' }
components:
  schemas:
    Choice:
      oneOf:
        - { type: string }
        - { type: number }
    Combined:
      allOf:
        - { type: object, properties: { left: { type: string } } }
        - { type: object, properties: { right: { type: boolean } } }
    Node:
      type: object
      required: [id, roles]
      properties:
        id: { type: integer }
        label: { type: string, nullable: true }
        roles: { type: array, items: { type: string, enum: [admin, user] } }
        metadata: { type: object, additionalProperties: true }
        children: { type: array, items: { $ref: '#/components/schemas/Node' } }
`
