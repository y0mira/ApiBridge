export const SAMPLE_SPEC = `openapi: 3.1.0
info:
  title: Minimal Petstore example
  version: 1.0.0
paths:
  /pets:
    get:
      operationId: listPets
      summary: List pets
      tags: [Pets]
      responses:
        '200':
          description: Pet list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
  /pets/{petId}:
    get:
      operationId: getPet
      summary: Find a pet
      tags: [Pets]
      parameters:
        - name: petId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: A pet
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Pet' }
components:
  schemas:
    Pet:
      type: object
      required: [id, name]
      properties:
        id: { type: integer }
        name: { type: string }
        status: { type: [string, 'null'], enum: [available, adopted] }
`
