<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Video providers live behind `VideoProvider` in src/lib/video-provider.server.ts; swap providers there only, so the rest of the app stays provider-agnostic.
- Credit reservation/refund happens only in DB functions (reserve_generation, fail_and_refund); never adjust balances from app code, to keep spending atomic.
