# Call-stack traces

Each trace uses this order:

```text
public or browser entry
  -> adapter handler
    -> state transition
      -> shared geometry or graph operation
        -> DOM or scheduler effect
          -> rendered output or emitted semantic change
```

Every node cites an imported `path:line`. Tests appear under the production node they verify. Unverified behavior is marked as unverified instead of inferred.

Every trace ends with `## Conformity and deviations`. Classify each compared behavior as:

- **Conforms** when Flow preserves a reference behavior and the named evidence supports the comparison.
- **Deviates** when Flow intentionally chooses different behavior or ownership. State why and name the test boundary.
- **Unverified** when Flow has not implemented or tested enough behavior to compare.

Do not use **Conforms** as a parity claim unless a test runs against the pinned reference behavior or output.
