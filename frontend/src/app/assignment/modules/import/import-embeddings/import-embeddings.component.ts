import {Component, OnInit} from '@angular/core';
import {EstimatedCosts} from "../../../model/solution";
import {ActivatedRoute} from "@angular/router";
import {switchMap, tap} from "rxjs/operators";
import {EmbeddingService} from "../../../services/embedding.service";

@Component({
  selector: 'app-import-embeddings',
  templateUrl: './import-embeddings.component.html',
  styleUrls: ['./import-embeddings.component.scss']
})
export class ImportEmbeddingsComponent implements OnInit {
  estimatedCosts?: EstimatedCosts;
  finalCosts?: EstimatedCosts;

  constructor(
    private embeddingService: EmbeddingService,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.route.params.pipe(
      switchMap(({aid}) => this.embeddingService.import(aid, true)),
    ).subscribe(costs => this.estimatedCosts = costs);
  }

  import() {
    const assignmentId = this.route.snapshot.params.aid;
    return this.embeddingService.import(assignmentId).pipe(
      tap(result => this.finalCosts = result),
    );
  }
}