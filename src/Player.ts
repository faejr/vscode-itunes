import { window, StatusBarAlignment, StatusBarItem } from "vscode";
import iTunes from "./iTunes";
import ITrack, { MediaType } from "./ITrack";
import Config from "./Config";
import TrackFactory from "./Factories/TrackFactory";
import { tmpdir } from "os";
import { unlinkSync, writeFileSync } from "fs";
import PlayerViewProvider from "./PlayerViewProvider";

export default class Player {
  public static Instance: Player;

  private iTunes: iTunes;
  private titleBarItem: StatusBarItem = null;
  private playerButton: StatusBarItem = null;
  private previousTrackButton: StatusBarItem = null;
  private nextTrackButton: StatusBarItem = null;
  private stateButton: StatusBarItem = null;
  private updateInterval: NodeJS.Timeout;
  private repeatButton: StatusBarItem = null;
  private shuffleButton: StatusBarItem = null;
  private likeButton: StatusBarItem = null;
  private dislikeButton: StatusBarItem = null;
  private addToLibrayButton: StatusBarItem = null;

  private defaultArtwork: string =
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBkYXRhLW5hbWU9IkxheWVyIDEiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxzdHlsZT4uY2xzLTF7ZmlsbDojZmZmO30uY2xzLTJ7ZmlsbDp1cmwoI2EpO308L3N0eWxlPgo8bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIxMC4xIiB4Mj0iNTguNjciIHkxPSI0Ny4wNyIgeTI9IjEzLjY1IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNkZTVkNzQiIG9mZnNldD0iMCIvPgo8c3RvcCBzdG9wLWNvbG9yPSIjN2UzMWYzIiBvZmZzZXQ9Ii41Ii8+CjxzdG9wIHN0b3AtY29sb3I9IiMxMmUyZWEiIG9mZnNldD0iMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+CjxyZWN0IGNsYXNzPSJjbHMtMSIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iNiIvPgo8cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0zMiwyLjUzQTI5LjQ3LDI5LjQ3LDAsMSwwLDYxLjQ3LDMyLDI5LjQ2LDI5LjQ2LDAsMCwwLDMyLDIuNTNabTAsMzcuMjVBNy43OCw3Ljc4LDAsMSwxLDM5Ljc4LDMyLDcuNzgsNy43OCwwLDAsMSwzMiwzOS43OFoiLz4KPC9zdmc+";

  private statusBarPositionOffset: number = 10;

  constructor() {
    Player.Instance = this;

    this.onUpdate = this.onUpdate.bind(this);

    this.iTunes = new iTunes();

    this.createStatusBarItem();
    this.updateInterval = setInterval(
      this.onUpdate,
      Config.Instance.getStatusCheckInterval()
    );
    this.updateStatusBarItem();
  }

  private onUpdate() {
    this.updateStatusBarItem();
  }

  private createStatusBarItem() {
    this.previousTrackButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      14 + this.statusBarPositionOffset
    );
    this.previousTrackButton.text = "$(chevron-left)";
    this.previousTrackButton.command = "itunes.previousTrack";
    this.previousTrackButton.tooltip = "Play Previous Track";

    this.playerButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      13 + this.statusBarPositionOffset
    );

    this.nextTrackButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      12 + this.statusBarPositionOffset
    );
    this.nextTrackButton.text = "$(chevron-right)";
    this.nextTrackButton.command = "itunes.nextTrack";
    this.nextTrackButton.tooltip = "Play Next Track";

    this.addToLibrayButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      11 + this.statusBarPositionOffset
    );
    this.addToLibrayButton.text = "$(plus)";
    this.addToLibrayButton.command = "itunes.addTrack";
    this.addToLibrayButton.tooltip =
      "Add current playing to track to your iTunes/Apple Music master library.";

    this.titleBarItem = window.createStatusBarItem(
      StatusBarAlignment.Left,
      10 + this.statusBarPositionOffset
    );
    this.titleBarItem.command = "itunes.open";
    this.titleBarItem.tooltip = "Show iTunes";
    this.titleBarItem.show();

    this.repeatButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      9 + this.statusBarPositionOffset
    );
    this.shuffleButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      8 + this.statusBarPositionOffset
    );

    this.stateButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      7 + this.statusBarPositionOffset
    );
    this.stateButton.text = "$(mute)";
    this.stateButton.command = "itunes.volume";

    this.likeButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      6 + this.statusBarPositionOffset
    );
    this.likeButton.text = "$(thumbsup)";
    this.likeButton.command = "itunes.likeTrack";

    this.dislikeButton = window.createStatusBarItem(
      StatusBarAlignment.Left,
      5 + this.statusBarPositionOffset
    );
    this.dislikeButton.text = "$(thumbsdown)";
    this.dislikeButton.command = "itunes.dislikeTrack";
  }

  private updateStatusBarItem() {
    this.iTunes.getAppState().then((app: any) => {
      if (app.appState === "running") {
        this.iTunes
          .getCurrentTrack()
          .then((track: any) => {
            const currentTrack: ITrack = TrackFactory.create(track);

            if (currentTrack.artist != null && currentTrack.name != null) {
              this.iTunes
                .saveArt()
                .then((bin: any) => {
                  if (bin) {
                    const b64 = bin.toString("base64");
                    PlayerViewProvider.Instance.setArtwork(
                      `data:image/jpeg;base64,${b64}`
                    );
                    return;
                  }
                  PlayerViewProvider.Instance.setArtwork(this.defaultArtwork);
                })
                .catch((err) => {
                  console.log(err);
                });

              this.updateStatusText(
                currentTrack.artist,
                currentTrack.name,
                currentTrack.album,
                currentTrack.kind
              );

              this.titleBarItem.show();
              this.stateButton.show();
            }

            if (currentTrack.volume >= 1) {
              this.stateButton.text = "$(unmute)";
              this.stateButton.tooltip = "Mute Volume";
            } else {
              this.stateButton.text = "$(mute)";
              this.stateButton.tooltip = "Unmute Volume";
            }

            switch (currentTrack.state) {
              case "playing":
                this.playerButton.text = "$(primitive-square)";
                this.playerButton.command = "itunes.pause";
                this.playerButton.tooltip = "Pause Track";
                break;

              case "paused":
              case "stopped":
                this.playerButton.text = "$(play)";
                this.playerButton.command = "itunes.play";
                this.playerButton.tooltip = "Play Track";
                break;
            }

            switch (currentTrack.repeat_song) {
              case "all":
                this.repeatButton.text = "$(sync) All";
                this.repeatButton.command = "itunes.repeat.set.one";
                break;

              case "one":
                this.repeatButton.text = "$(sync) One";
                this.repeatButton.command = "itunes.repeat.set.off";
                break;

              case "off":
                this.repeatButton.text = "$(sync) Off";
                this.repeatButton.command = "itunes.repeat.set.all";
                break;
            }

            if (currentTrack.shuffle === "true") {
              this.shuffleButton.text = "$(git-compare) On";
              this.shuffleButton.command = "itunes.shuffle.off";
              this.shuffleButton.tooltip = "Turn Shuffle Off";
            } else {
              this.shuffleButton.text = "$(git-compare) Off";
              this.shuffleButton.command = "itunes.shuffle.on";
              this.shuffleButton.tooltip = "Turn Shuffle On";
            }

            if (currentTrack.loved === true) {
              this.likeButton.text = "$(thumbsup) $(check)";
            } else {
              this.likeButton.text = "$(thumbsup)";
            }

            if (currentTrack.disliked === true) {
              this.dislikeButton.text = "$(thumbsdown) $(check)";
            } else {
              this.dislikeButton.text = "$(thumbsdown)";
            }

            this.showMediaControls();
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        this.hideMediaControls();
      }
    });
  }

  private updateStatusText(
    artist: string,
    name: string,
    album: string,
    kind: MediaType
  ) {
    const title = `${name} - ${artist} — ${album}`;
    const titleStringLimit = Config.Instance.getTitleStringLimit();
    let displayedTitle = title;

    if (titleStringLimit > 0) {
      displayedTitle = title.substr(0, titleStringLimit);
      if (displayedTitle.length < title.length) {
        displayedTitle += "...";
      }
    }

    PlayerViewProvider.Instance.setSong({ artist, name, album });
    this.titleBarItem.text = displayedTitle;
    this.titleBarItem.tooltip = title;

    this.titleBarItem.show();
  }

  public open(): void {
    this.iTunes.open();
  }

  public play(): void {
    this.iTunes.play();
  }

  public pause(): void {
    this.iTunes.pause();
  }

  public nextTrack(): void {
    this.iTunes.nextTrack();
  }

  public previousTrack(): void {
    this.iTunes.previousTrack();
  }

  public shuffleOn(): void {
    this.iTunes.shuffle(true);
  }

  public shuffleOff(): void {
    this.iTunes.shuffle(false);
  }

  public addTrack(): void {
    this.iTunes.addTrack();
  }

  public setRepeat(repeat: string): void {
    this.iTunes.setRepeat(repeat);
  }

  public dispose(): void {
    this.titleBarItem.dispose();
    clearInterval(this.updateInterval);
  }

  private showMediaControls(): void {
    this.previousTrackButton.show();
    this.playerButton.show();
    this.nextTrackButton.show();
    this.repeatButton.show();
    this.titleBarItem.show();
    this.stateButton.show();
    this.shuffleButton.show();
    this.likeButton.show();
    this.dislikeButton.show();
    this.addToLibrayButton.show();
  }

  private hideMediaControls(): void {
    this.previousTrackButton.hide();
    this.playerButton.hide();
    this.nextTrackButton.hide();
    this.repeatButton.hide();
    this.titleBarItem.hide();
    this.stateButton.hide();
    this.shuffleButton.hide();
    this.likeButton.hide();
    this.dislikeButton.hide();
    this.addToLibrayButton.hide();
  }

  public volume(): void {
    if (this.stateButton.text === "$(mute)") {
      this.iTunes.unmute();
    } else {
      this.iTunes.mute();
    }
  }

  public likeTrack(): void {
    this.iTunes.like();
  }

  public dislikeTrack(): void {
    if (Config.Instance.getSkipTrackDislike() === true) {
      this.iTunes.dislikeTrackAndSkip();
    } else {
      this.iTunes.dislikeTrack();
    }
  }
}
