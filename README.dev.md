# Developer notes/style standards

the module structure has some basic standards: 

/src/index.ts 
  the root exportable. includes:
* types.ts
* schema.ts
* helpers.ts
* all state and class files publicly useful

/src/helpers.ts <
  helper functions - all pure/stateless
/src/schema.ts 
   zod scheas 

/src/types.ts 
    all types; very little/no localized types elsewhere
    import schema from './schema' and use `z.infer<typeof schema>` to create complex types
/src/constants <--- all constants; never use string values anywhere; 

## Types

When do you create zod schema? 
1. when you think you'll need type guards
2. for any state value types

What about typeguards?
Mostly using zod.parse and z.safeParse to enforce type fidelity

## Style and Style DSL 

we use styleTree to parse style configurations almost always. StyleTree 
has a DSL that is mostly followed. it can for instance resolve base and extended styles. 

For the most part styles shoudl be defined in json files or POJOs. AI likes to use 
parameteric definitions for styles but that is the most verbose/least reaable way
to do style definition. 