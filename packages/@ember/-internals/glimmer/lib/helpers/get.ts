import { get as emberGet, set as emberSet } from '@ember/-internals/metal';
import { isObject } from '@ember/-internals/utils';
import { CapturedArguments, VMArguments } from '@glimmer/interfaces';
import { HelperRootReference, PathReference, UPDATE_REFERENCED_VALUE } from '@glimmer/reference';
import { NULL_REFERENCE } from '@glimmer/runtime';
import { referenceFromParts } from '../utils/references';

/**
@module ember
*/

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivalent:

  ```app/components/developer-detail.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }
  }
  ```

  ```handlebars
  {{this.developer.name}}
  {{get this.developer "name"}}
  ```

  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```app/templates/application.hbs
  <DeveloperDetail @factName="language" />
  ```

  ```handlebars
  {{get this.developer @factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's height and weight with a click:

  ```app/components/developer-detail.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }

    @tracked currentFact = 'name'

    @action
    showFact(fact) {
      this.currentFact = fact;
    }
  }
  ```

  ```app/components/developer-detail.js
  {{get this.developer this.currentFact}}

  <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
  <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
  ```

  The `{{get}}` helper can also respect mutable values itself. For example:

  ```app/components/developer-detail.js
  <Input @value={{mut (get this.person this.currentFact)}} />

  <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
  <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
  ```

  Would allow the user to swap what fact is being displayed, and also edit
  that fact via a two-way mutable binding.

  @public
  @method get
  @for Ember.Templates.helpers
  @since 2.1.0
 */
export default function(args: VMArguments) {
  let sourceReference = args.positional.at(0);
  let pathReference = args.positional.at(1);

  let path = pathReference.value();

  if (pathReference.isConst()) {
    // Since the path is constant, we can create a normal chain of property
    // references. The source reference will update like normal, and all of the
    // child references will update accordingly.

    if (path === undefined || path === null || path === '') {
      return NULL_REFERENCE;
    } else if (typeof path === 'string' && path.indexOf('.') > -1) {
      return referenceFromParts(sourceReference, path.split('.'));
    } else {
      return sourceReference.get(String(path));
    }
  } else {
    return new GetHelperRootReference(args.capture());
  }
}

function get({ positional }: CapturedArguments) {
  let source = positional[0].value();

  if (isObject(source)) {
    let path = positional[1].value();

    return emberGet(source, String(path));
  }
}

class GetHelperRootReference extends HelperRootReference {
  private sourceReference: PathReference<object>;
  private pathReference: PathReference<string>;

  constructor(args: CapturedArguments) {
    super(get, args);
    this.sourceReference = args.positional[0] as PathReference<object>;
    this.pathReference = args.positional[1] as PathReference<string>;
  }

  [UPDATE_REFERENCED_VALUE](value: any) {
    let source = this.sourceReference.value();

    if (isObject(source)) {
      let path = String(this.pathReference.value());

      emberSet(source, path, value);
    }
  }
}
