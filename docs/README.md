# Documentation

This directory contains technical documentation for the HiFiBerryOS WebUI project.

## Architecture

This project is built on [VueJS][1]. [VueJS][1] provides a way to seperate
different components, thus creating [separation of concerns][2]. Using this
framework also improves the reusability of code.

The project also uses the [pinia store][4] for local storage synchronization.

### Folder overview
- `.vscode`: Recommended [VSCode][3] extensions
- `debian`: Debian packaging files
- `debug`: Scripts to help debugging the project
- `docs`: Project documentation
- `public`: Assets, such as fonts, images or the favicon
- `src`: Code of the project
- `src/api`: API abstraction layers
- `src/assets`: SCSS stuff
- `src/components`: Components that are used throughout the website
- `src/composables`: Reuse logic using vue's Composition API
- `src/helpers`: Useful helpers functions
- `src/layouts`: Available layouts for vuejs
- `src/router`: Router definitions. Those file/s in here define what to show when going to what url
- `src/services`: Functions and types that connect with external services
- `src/stores`: [Pinia][4] stores
- `src/types`: Types that are used throughout the project
- `src/utils`: Utility function definitions
- `src/views`: The different ui views

## Available Documentation

- **[Button System](./button-system.md)** - Comprehensive guide to the button mixin system, including usage examples and best practices
- **[Cover](./cover.md)** - Contract, placeholder behavior, and regression test coverage for the reusable artwork component
- **[Poster](./poster.md)** - Poster card rendering contract, placeholder behavior, and regression test coverage
- **[PosterGrid](./poster-grid.md)** - Poster collection rendering contract, pagination/row loading behavior, and regression coverage
- **[ContentBoxLink](./content-box-link.md)** - Contract and regression notes for the linked content card wrapper component
- **[ListenNow](./listen-now.md)** - Click-emitting playback action component contract and regression coverage
- **[ProgressControl](./progress-control.md)** - Timeline composition contract, seek-disabling guard behavior, and regression coverage
- **[ProgressTime](./progress-time.md)** - Textual seek/duration label contract, visibility rules, and regression coverage
- **[ProgressSlider](./progress-slider.md)** - Reusable slider interaction contract, drag/touch behavior, and regression coverage
- **[MetadataTooltip](./metadata-tooltip.md)** - Track and stream metadata tooltip contract, empty-state rules, and regression coverage
- **[LyricsOverlay](./lyrics-overlay.md)** - Modal lyrics display contract, synced highlighting behavior, and regression coverage
- **[ToggleSwitch](./toggle-switch.md)** - Controlled boolean switch contract, accessibility attribute forwarding, and regression coverage
- **[Crossover Filters Composable](./crossover-filters-composable.md)** - Pair-linking contract, channel-level linking semantics, and regression coverage
- **[Known Issues & Fixes](./fixes-needed.md)** - Current issues, fixes needed, and technical notes
- **[Missing Icons](./missing-icons.md)** - Icons that are currently missing

## Contributing

When adding new components or systems, please:

1. Document any new mixins or utilities in the appropriate files
2. Include usage examples and best practices
3. Update this index file with new documentation links

[1]: https://vuejs.org
[2]: https://en.wikipedia.org/wiki/Separation_of_concerns
[3]: https://code.visualstudio.com/download
[4]: https://pinia.vuejs.org
